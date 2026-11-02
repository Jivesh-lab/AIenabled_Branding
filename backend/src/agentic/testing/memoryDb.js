/**
 * A small in-memory stand-in for the Mongoose models, used ONLY by tests (the repo's existing tests stub
 * models the same way; this generalises it). It runs the REAL schema defaults and validation and enforces
 * the schema's unique indexes (including partial ones), so the agent code under test is the production code.
 *
 * Supported: create, find/findOne/findById (sort, limit, select, lean, populate no-op), findOneAndUpdate,
 * updateOne, updateMany, deleteOne, countDocuments; query operators $in $nin $ne $gt $gte $lt $lte $exists
 * $size $or $and $type $not; update operators $set $inc $push($each/$slice) $setOnInsert; dotted paths.
 */
const mongoose = require('mongoose');

let counter = 0;
const nextId = () => (++counter).toString(16).padStart(24, '0');
const isId = (v) => v && typeof v === 'object' && v._bsontype === 'ObjectId';
const norm = (v) => (isId(v) ? String(v) : v instanceof Date ? v.getTime() : v);

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : Array.isArray(acc) && !/^\d+$/.test(key) ? acc.map((x) => x?.[key]).flat() : acc[key]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((key) => {
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  });
  cur[keys[keys.length - 1]] = value;
}

function eq(a, b) {
  return norm(a) === norm(b);
}

function matchValue(actual, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && !isId(cond) && !(cond instanceof RegExp)) {
    const ops = Object.keys(cond);
    if (ops.some((k) => k.startsWith('$'))) {
      return ops.every((op) => {
        const v = cond[op];
        const list = Array.isArray(actual) ? actual : [actual];
        switch (op) {
          case '$in': return v.some((x) => list.some((a) => eq(a, x)));
          case '$nin': return !v.some((x) => list.some((a) => eq(a, x)));
          case '$ne': return !list.some((a) => eq(a, v)) && !(actual === undefined && v === undefined);
          case '$gt': return actual != null && norm(actual) > norm(v);
          case '$gte': return actual != null && norm(actual) >= norm(v);
          case '$lt': return actual != null && norm(actual) < norm(v);
          case '$lte': return actual != null && norm(actual) <= norm(v);
          case '$exists': return (actual !== undefined) === Boolean(v);
          case '$size': return Array.isArray(actual) && actual.length === v;
          case '$type': return v === 'string' ? typeof actual === 'string' : true;
          case '$regex': return new RegExp(v, cond.$options || '').test(String(actual));
          case '$options': return true;
          case '$not': return !matchValue(actual, v);
          default: throw new Error(`memoryDb: unsupported operator ${op}`);
        }
      });
    }
  }
  if (cond instanceof RegExp) return typeof actual === 'string' && cond.test(actual);
  if (Array.isArray(actual)) return actual.some((a) => eq(a, cond)) || (Array.isArray(cond) && JSON.stringify(actual) === JSON.stringify(cond));
  if (cond === null) return actual == null;
  return eq(actual, cond);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((f) => matches(doc, f));
    if (key === '$and') return cond.every((f) => matches(doc, f));
    return matchValue(getPath(doc, key), cond);
  });
}

function applyUpdate(doc, update, inserting = false) {
  const out = doc;
  const plainKeys = Object.keys(update).filter((k) => !k.startsWith('$'));
  plainKeys.forEach((k) => setPath(out, k, update[k]));
  Object.entries(update.$set || {}).forEach(([k, v]) => setPath(out, k, v === undefined ? undefined : structuredClone(v)));
  Object.entries(update.$inc || {}).forEach(([k, v]) => setPath(out, k, (getPath(out, k) || 0) + v));
  Object.entries(update.$push || {}).forEach(([k, v]) => {
    const arr = [...(getPath(out, k) || [])];
    if (v && v.$each) {
      arr.push(...v.$each.map((x) => structuredClone(x)));
      setPath(out, k, v.$slice && v.$slice < 0 ? arr.slice(v.$slice) : arr);
    } else {
      arr.push(structuredClone(v));
      setPath(out, k, arr);
    }
  });
  if (inserting) Object.entries(update.$setOnInsert || {}).forEach(([k, v]) => setPath(out, k, structuredClone(v)));
  out.updatedAt = new Date();
  return out;
}

function uniqueIndexes(Model) {
  const indexes = [];
  Model.schema.indexes().forEach(([fields, options]) => {
    if (options && options.unique) indexes.push({ fields: Object.keys(fields), partial: options.partialFilterExpression || null });
  });
  return indexes;
}

function violatesUnique(Model, store, candidate, ignore) {
  return uniqueIndexes(Model).some(({ fields, partial }) => {
    if (partial && !matches(candidate, partial)) return false;
    const values = fields.map((f) => getPath(candidate, f));
    if (values.some((v) => v === undefined || v === null)) return false;
    return store.some((other) => other !== ignore && (!partial || matches(other, partial)) && fields.every((f, i) => eq(getPath(other, f), values[i])));
  });
}

function duplicateError(Model) {
  const error = new Error(`E11000 duplicate key error (${Model.modelName})`);
  error.code = 11000;
  return error;
}

function query(run) {
  const state = { sort: null, limit: null, lean: false };
  const q = {
    sort(s) { state.sort = s; return q; },
    limit(n) { state.limit = n; return q; },
    select() { return q; },
    populate() { return q; },
    lean() { state.lean = true; return q; },
    then(res, rej) { return Promise.resolve().then(() => run(state)).then(res, rej); },
    catch(rej) { return q.then(undefined, rej); },
  };
  return q;
}

function sortDocs(docs, sort) {
  if (!sort) return docs;
  const keys = Object.entries(sort);
  return [...docs].sort((a, b) => {
    for (const [k, dir] of keys) {
      const av = norm(getPath(a, k)) ?? 0;
      const bv = norm(getPath(b, k)) ?? 0;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
    }
    return 0;
  });
}

// ObjectIds do not survive structuredClone, so ids are stored as plain hex strings (as they are on the wire).
function deepNorm(value) {
  if (isId(value)) return String(value);
  if (Array.isArray(value)) return value.map(deepNorm);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    Object.keys(value).forEach((k) => { out[k] = deepNorm(value[k]); });
    return out;
  }
  return value;
}

const clone = (d) => (d == null ? d : structuredClone(d));

/** Install the in-memory implementation on the given models. Returns helpers; call `restore()` after the test file. */
function install(models, { readOnly = [] } = {}) {
  const stores = new Map();
  const originals = new Map();
  models.forEach((Model) => {
    const store = [];
    stores.set(Model, store);
    const saved = {};
    ['create', 'find', 'findOne', 'findById', 'findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'countDocuments', 'aggregate'].forEach((m) => { saved[m] = Model[m]; });
    originals.set(Model, saved);
    const frozen = readOnly.includes(Model.modelName);

    Model.create = async (data) => {
      const doc = new Model(data);
      await doc.validate();
      const obj = deepNorm(doc.toObject({ depopulate: true, minimize: false }));
      obj._id = nextId();
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      Object.keys(obj).forEach((k) => { if (obj[k] === undefined) delete obj[k]; });
      if (violatesUnique(Model, store, obj)) throw duplicateError(Model);
      store.push(obj);
      return { ...clone(obj), toObject() { return clone(obj); } };
    };
    Model.find = (filter = {}) => query((s) => {
      let docs = sortDocs(store.filter((d) => matches(d, filter)), s.sort);
      if (s.limit) docs = docs.slice(0, s.limit);
      return docs.map(clone);
    });
    Model.findOne = (filter = {}) => query((s) => clone(sortDocs(store.filter((d) => matches(d, filter)), s.sort)[0] || null));
    Model.findById = (id) => Model.findOne({ _id: id });
    Model.countDocuments = async (filter = {}) => store.filter((d) => matches(d, filter)).length;
    // Only what the dashboards use: $match, then $group by one field or an object of fields with { $sum: 1 }.
    Model.aggregate = async (stages = []) => {
      let docs = store.map(clone);
      for (const stage of stages) {
        if (stage.$match) docs = docs.filter((d) => matches(d, stage.$match));
        else if (stage.$group) {
          const ref = (expr, d) => (typeof expr === 'string' && expr.startsWith('$') ? getPath(d, expr.slice(1)) : expr);
          const groups = new Map();
          docs.forEach((d) => {
            const id = stage.$group._id && typeof stage.$group._id === 'object' ? Object.fromEntries(Object.entries(stage.$group._id).map(([k, v]) => [k, ref(v, d)])) : ref(stage.$group._id, d);
            const key = JSON.stringify(id);
            if (!groups.has(key)) groups.set(key, { _id: id, count: 0 });
            groups.get(key).count += 1;
          });
          docs = [...groups.values()];
        }
      }
      return docs;
    };
    if (!frozen) {
      Model.findOneAndUpdate = (filter, update, options = {}) => query((s) => {
        const hit = sortDocs(store.filter((d) => matches(d, filter)), options.sort || s.sort)[0];
        if (!hit) {
          if (!options.upsert) return null;
          const created = {};
          Object.entries(filter).forEach(([k, v]) => { if (!k.startsWith('$') && (typeof v !== 'object' || v === null)) setPath(created, k, v); });
          const doc = new Model({ ...created });
          const obj = doc.toObject({ depopulate: true, minimize: false });
          obj._id = nextId();
          obj.createdAt = new Date();
          applyUpdate(obj, update, true);
          store.push(obj);
          return clone(obj);
        }
        const before = clone(hit);
        const next = applyUpdate(clone(hit), update);
        if (violatesUnique(Model, store, next, hit)) throw duplicateError(Model);
        Object.keys(hit).forEach((k) => delete hit[k]);
        Object.assign(hit, next);
        return options.returnDocument === 'after' || options.new ? clone(hit) : before;
      });
      Model.updateOne = async (filter, update) => {
        const hit = store.find((d) => matches(d, filter));
        if (!hit) return { matchedCount: 0, modifiedCount: 0 };
        applyUpdate(hit, update);
        return { matchedCount: 1, modifiedCount: 1 };
      };
      Model.updateMany = async (filter, update) => {
        const hits = store.filter((d) => matches(d, filter));
        hits.forEach((d) => applyUpdate(d, update));
        return { matchedCount: hits.length, modifiedCount: hits.length };
      };
      Model.deleteOne = async (filter) => {
        const i = store.findIndex((d) => matches(d, filter));
        if (i >= 0) store.splice(i, 1);
        return { deletedCount: i >= 0 ? 1 : 0 };
      };
    }
  });

  return {
    store: (Model) => stores.get(Model),
    seed(Model, data) {
      const obj = deepNorm(new Model(data).toObject({ depopulate: true, minimize: false }));
      obj._id = data._id ? String(data._id) : nextId();
      obj.createdAt = data.createdAt || new Date();
      obj.updatedAt = new Date();
      Object.keys(obj).forEach((k) => { if (obj[k] === undefined) delete obj[k]; });
      stores.get(Model).push(obj);
      return clone(obj);
    },
    clear() { stores.forEach((s) => { s.length = 0; }); },
    restore() { originals.forEach((saved, Model) => Object.assign(Model, saved)); },
    nextId,
  };
}

module.exports = { install, matches, applyUpdate };
