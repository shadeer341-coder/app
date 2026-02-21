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

interface InterviewCompletedEmailProps {
  name: string;
  sessionId: string;
  overallScore: number;
}

const baseUrl = 'https://app.precasprep.com';

export const InterviewCompletedEmail = ({
  name,
  sessionId,
  overallScore,
}: InterviewCompletedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your precasprep interview feedback is ready!
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
          Great news! Your interview has been analyzed, and your feedback is now ready to view.
        </Text>
        <Text style={paragraph}>
          Your overall score for this session was <strong>{overallScore}%</strong>.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={`${baseUrl}/dashboard/interviews/${sessionId}`}>
            View My Detailed Feedback
          </Button>
        </Section>
        <Text style={paragraph}>
          Reviewing your feedback is a crucial step to improving your performance. Take some time to go through the analysis and identify your strengths and areas for improvement.
        </Text>
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

InterviewCompletedEmail.displayName = "InterviewCompletedEmail"
export default InterviewCompletedEmail;

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
