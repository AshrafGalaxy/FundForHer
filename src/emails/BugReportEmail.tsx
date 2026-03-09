import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';
import React from 'react';

interface BugReportEmailProps {
    title: string;
    description: string;
    stepsToReproduce?: string;
    userEmail: string;
    userId: string;
    screenshots?: string[];
    userAgent?: string;
}

export const BugReportEmail = ({
    title,
    description,
    stepsToReproduce,
    userEmail,
    userId,
    screenshots,
    userAgent,
}: BugReportEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>🚨 New Bug Report: {title}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>🚨 Bug Report Submitted</Heading>
                    <Text style={text}>
                        A user has encountered an issue on the platform. Here are the details:
                    </Text>

                    <Section style={infoBox}>
                        <Text style={heading}>Issue Details</Text>
                        <Text style={listItem}><strong>Title:</strong> {title}</Text>
                        <Text style={listItem}><strong>User:</strong> {userEmail} ({userId})</Text>
                        <Text style={listItem}><strong>Description:</strong> {description}</Text>
                        {stepsToReproduce && (
                            <Text style={listItem}><strong>Steps to Reproduce:</strong> {stepsToReproduce}</Text>
                        )}
                        {userAgent && (
                            <Text style={listItem}><strong>Device/Browser:</strong> {userAgent}</Text>
                        )}
                    </Section>

                    {screenshots && screenshots.length > 0 && (
                        <Section style={{ marginTop: '20px' }}>
                            <Text style={heading}>Attached Screenshots</Text>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {screenshots.map((url, i) => (
                                    <Link key={i} href={url} target="_blank">
                                        <Img src={url} alt={`Screenshot ${i + 1}`} width="200" style={imgStyle} />
                                    </Link>
                                ))}
                            </div>
                        </Section>
                    )}

                    <Hr style={hr} />
                    <Text style={footer}>
                        Sent automatically by Fund Her Future App
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default BugReportEmail;

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    borderRadius: '8px',
    border: '1px solid #eaeaea',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    paddingLeft: '24px',
    paddingRight: '24px',
};

const h1 = {
    color: '#e11d48', // Destructive red color for bugs
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '40px',
    margin: '0 0 20px',
};

const heading = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
};

const text = {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '24px',
};

const infoBox = {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #eaeaea',
};

const listItem = {
    color: '#525f7f',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '4px 0',
};

const imgStyle = {
    borderRadius: '4px',
    border: '1px solid #eaeaea',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
};
