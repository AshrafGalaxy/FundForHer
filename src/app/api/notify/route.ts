import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { BugReportEmail } from '@/emails/BugReportEmail';
import { FeedbackEmail } from '@/emails/FeedbackEmail';
import { AcknowledgmentEmail } from '@/emails/AcknowledgmentEmail';

// Helper to determine formatting based on payload type
interface NotifyPayload {
    type: 'experience' | 'bug';
    userEmail: string;
    userId: string;
    submittedAt: string;
    [key: string]: any;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const body: NotifyPayload = await req.json();
        const { type, userEmail, userId, ...details } = body;

        // Ensure API key exists
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY is not set. Skipping email notification.");
            return NextResponse.json({ success: false, message: 'Email skipped (no API key)' }, { status: 200 }); // Still return 200 so UI doesn't break
        }

        // The email address that receives Bug Reports and General Feedback
        // If not set in .env.local, fallback to a default email (You should change this to yours)
        const devEmailRecipient = process.env.DEVELOPER_EMAIL || 'ashraf@fundherfuture.com';
        // 1. Send Notification to Developer
        let devEmailSubject = '';
        let devEmailReact;

        if (type === 'bug') {
            devEmailSubject = `🚨 New Bug Report: ${details.title}`;
            devEmailReact = BugReportEmail({
                title: details.title,
                description: details.description,
                stepsToReproduce: details.stepsToReproduce,
                userEmail,
                userId,
                screenshots: details.screenshots,
                userAgent: details.userAgent,
            });
        } else {
            devEmailSubject = `✨ New Platform Feedback Received!`;
            devEmailReact = FeedbackEmail({
                overallExperience: details.overallExperience,
                findability: details.findability,
                designAppeal: details.designAppeal,
                infoQuality: details.infoQuality,
                recommendLikelihood: details.recommendLikelihood,
                additionalComments: details.additionalComments,
                userEmail,
                userId,
            });
        }

        const devData = await resend.emails.send({
            from: 'Fund Her Future App <onboarding@resend.dev>', // Update this when you have a custom domain
            to: [devEmailRecipient], // Developer email
            subject: devEmailSubject,
            react: devEmailReact,
        });

        if (devData.error) {
            console.error("Developer email failed:", devData.error);
            return NextResponse.json({ error: devData.error }, { status: 400 });
        }

        // 2. Send Acknowledgment to User (Requires a Verified Domain in Resend)
        // If you are on the Resend free tier without a domain, you can only send emails to YOURSELF.
        // Uncomment this entire block once you purchase and verify a domain.
        /*
        if (userEmail && userEmail !== 'anonymous') {
            resend.emails.send({
                from: 'Fund Her Future Support <onboarding@resend.dev>', // Update to support@yourdomain.com
                to: [userEmail],
                subject: type === 'bug' ? 'We received your bug report! 🚀' : 'Thank you for your feedback! ✨',
                react: AcknowledgmentEmail({ type }),
            }).catch(e => console.error("Failed to send user ack email:", e));
        }
        */

        return NextResponse.json({ success: true, id: devData.data?.id });
    } catch (error: any) {
        console.error('Failed to send notification email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
