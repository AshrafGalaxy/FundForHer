import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Hr,
    Button,
} from '@react-email/components';
import React from 'react';

interface AcknowledgmentEmailProps {
    type: 'bug' | 'experience';
    userName?: string;
}

export const AcknowledgmentEmail = ({
    type,
    userName = 'there',
}: AcknowledgmentEmailProps) => {
    const isBug = type === 'bug';

    return (
        <Html>
            <Head />
            <Preview>Thank you for your {isBug ? 'bug report' : 'feedback'}! 🚀</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>We received your {isBug ? 'report' : 'feedback'}!</Heading>

                    <Text style={text}>
                        Hi {userName},
                    </Text>
                    <Text style={text}>
                        {isBug
                            ? "Thank you for taking the time to report an issue. Our engineering team has been notified and we're looking into it right away. We appreciate you helping us make FUND HER FUTURE better!"
                            : "Thank you for sharing your experience with us! We read every piece of feedback and use it to continually improve the platform for everyone."
                        }
                    </Text>

                    <Section style={btnContainer}>
                        <Button style={button} href="https://fundherfuture.com/authenticated/dashboard">
                            Return to Dashboard
                        </Button>
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        With gratitude,<br />
                        The Fund Her Future Team
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default AcknowledgmentEmail;

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 24px',
    marginBottom: '64px',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0 0 20px',
    textAlign: 'center' as const,
};

const text = {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '26px',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#10b981', // Emerald green 500
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '32px 0 24px',
};

const footer = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '20px',
};
