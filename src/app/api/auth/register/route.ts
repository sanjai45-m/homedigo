import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { executeQuery, isDbConfigured } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please provide valid account details." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object")
    return NextResponse.json(
      { error: "Please provide valid account details." },
      { status: 400 },
    );
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    !name ||
    name.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !/^[+\d ()-]{10,20}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 10 ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json(
      {
        error:
          "Enter your name, a valid email and phone number, and a password of 8–128 characters.",
      },
      { status: 400 },
    );
  }
  if (!isDbConfigured)
    return NextResponse.json(
      {
        error:
          "Account creation is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  const existing = await executeQuery(
    "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [email],
  );
  if (!existing.isConnected)
    return NextResponse.json(
      {
        error:
          "Account creation is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  if (existing.rows.length)
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 },
    );
  const result = await executeQuery(
    `INSERT INTO users (id, name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'PATIENT') ON CONFLICT (email) DO NOTHING RETURNING id`,
    [`usr_pat_${randomUUID()}`, name, email, phone, hashPassword(password)],
  );
  if (!result.isConnected)
    return NextResponse.json(
      { error: "We couldn’t create your account. Please try again later." },
      { status: 503 },
    );
  if (!result.rows.length)
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 },
    );
  return NextResponse.json({ success: true }, { status: 201 });
}
