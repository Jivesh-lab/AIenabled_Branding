import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const token = await createBackendToken(session.user.id, session.user.role);
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = await req.json();
    const token = await createBackendToken(session.user.id, session.user.role);
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "true";
    const token = await createBackendToken(session.user.id, session.user.role);

    const backendRes = await fetch(`${BACKEND_URL}/api/admin/users/${id}?hard=${hard}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
