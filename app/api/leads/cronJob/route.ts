// pages/api/test.ts or app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";

import { startCron } from "@/lib/scheduler";

export async function GET(req: NextRequest) {
  try {
    // Check if we want to force run or just get status
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'run' or 'status'
    
    if (action === 'run') {
      // Manually trigger the assignment
      const { assignLeadsManually } = await import("@/lib/scheduler");
      await assignLeadsManually();
      
      return NextResponse.json(
        { 
          message: "Lead assignment executed manually", 
          timestamp: new Date().toISOString() 
        },
        { status: 200 },
      );
    }
    
    // Default: restart cron
    const task = startCron();

    return NextResponse.json(
      { 
        message: "Lead assignment cron started/restarted",
        schedule: "Every 15 minutes (at :00, :15, :30, :45) from 9am to 6pm",
        currentTime: new Date().toLocaleString(),
        status: task ? "running" : "error"
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error", err);

    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
