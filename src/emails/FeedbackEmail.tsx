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
} from '@react-email/components';
import React from 'react';

interface FeedbackEmailProps {
    overallExperience: number;
    findability: number;
    designAppeal: number;
    infoQuality: number;
    recommendLikelihood: number;
    additionalComments?: string;
    userEmail: string;
    userId: string;
}

export const FeedbackEmail = ({
    overallExperience,
    findability,
    designAppeal,
    infoQuality,
    recommendLikelihood,
    additionalComments,
    userEmail,
    userId,
}: FeedbackEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>✨ New Platform Feedback: {overallExperience}/10</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>✨ New Platform Feedback</Heading>
                    <Text style={text}>
                        A user has shared their experience on the FUND HER FUTURE platform.
                    </Text>

                    <Section style={infoBox}>
                        <Text style={heading}>User Info</Text>
                        <Text style={listItem}><strong>Email:</strong> {userEmail}</Text>
                        <Text style={listItem}><strong>User ID:</strong> {userId}</Text>
                    </Section>

                    <Section style={{ marginTop: '20px', ...infoBox }}>
                        <Text style={heading}>Experience Scores (1-10)</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <Text style={scoreItem}>Overall Experience: <strong>{overallExperience}</strong></Text>
                            <Text style={scoreItem}>Findability: <strong>{findability}</strong></Text>
                            <Text style={scoreItem}>Design & Visuals: <strong>{designAppeal}</strong></Text>
                            <Text style={scoreItem}>Info Quality: <strong>{infoQuality}</strong></Text>
                            <Text style={scoreItem}>Likelihood to Recommend: <strong>{recommendLikelihood}</strong></Text>
                        </div>
                    </Section>

                    {additionalComments && (
                        <Section style={{ marginTop: '20px', ...infoBox, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                            <Text style={heading}>Additional Comments</Text>
                            <Text style={{ ...text, fontStyle: 'italic' }}>"{additionalComments}"</Text>
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

export default FeedbackEmail;

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
    color: '#4f46e5', // Primary brand color tone
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

const scoreItem = {
    ...listItem,
    backgroundColor: '#fff',
    border: '1px solid #eee',
    padding: '8px',
    borderRadius: '4px',
    margin: '4px 0',
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
