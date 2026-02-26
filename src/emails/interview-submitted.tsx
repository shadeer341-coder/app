
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InterviewSubmittedEmailProps {
  name: string;
  sessionId: string;
  submittedAt: Date;
}

const baseUrl = 'https://app.precasprep.com';

export const InterviewSubmittedEmail = ({
  name,
  sessionId,
  submittedAt,
}: InterviewSubmittedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your precasprep interview has been submitted
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/precasprep-logo.webp`}
          width={270}
          height={67.5}
          alt="precasprep"
          style={logo}
        />
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          We've successfully received your interview submitted on {submittedAt.toLocaleString()}. It is now being processed for feedback.
        </Text>
        <Text style={paragraph}>
          You will be able to view your results in your dashboard shortly. Please note that it can take approximately 5 hours to receive your detailed feedback.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={`${baseUrl}/dashboard/interviews/${sessionId}`}>
            View My Interview
          </Button>
        </Section>
        <Text style={paragraph}>
          Best,
          <br />
          The precasprep Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you have any questions, please contact our support team at support@precasprep.com.
        </Text>
      </Container>
    </Body>
  </Html>
);

InterviewSubmittedEmail.displayName = "InterviewSubmittedEmail"
export default InterviewSubmittedEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const logo = {
  margin: '0 auto',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
};

const btnContainer = {
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5e6ad2',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
};
