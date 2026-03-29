import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
    process.env.NEXT_PUBLIC_VALORA_API_BASE_URL ||
    "http://127.0.0.1:8000";

const ALLOWED_TRANSITIONS = new Set([
    "acknowledge",
    "start",
    "complete",
    "dismiss",
    "block",
]);

type RouteContext = {
    params: Promise<{
        actionExecutionId: string;
        transition: string;
    }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const user = await getSessionUser();

        if (!user?.user_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { actionExecutionId, transition } = await context.params;

        if (!actionExecutionId) {
            return NextResponse.json(
                { error: "Missing actionExecutionId" },
                { status: 400 }
            );
        }

        if (!ALLOWED_TRANSITIONS.has(transition)) {
            return NextResponse.json(
                { error: `Unsupported transition: ${transition}` },
                { status: 400 }
            );
        }

        let body: any = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        const payload = {
            ...body,
            changed_by_user_id: body?.changed_by_user_id ?? user.user_id,
            changed_by_name:
                body?.changed_by_name ??
                user.email ??
                "Valora User",
        };

        const res = await fetch(
            `${API_BASE}/api/ai/actions/${actionExecutionId}/${transition}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                cache: "no-store",
            }
        );

        const text = await res.text();

        return new NextResponse(text, {
            status: res.status,
            headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Failed to update action" },
            { status: 500 }
        );
    }
}