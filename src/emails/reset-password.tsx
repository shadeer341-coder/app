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

interface ResetPasswordEmailProps {
  name: string;
  code: string;
}

const baseUrl = 'https://app.precasprep.com';

export const ResetPasswordEmail = ({
  name,
  code,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your precasprep password reset code
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
          Someone recently requested a password change for your precasprep account. If this was you, use the code below to reset your password.
        </Text>
        <Section style={codeContainer}>
          <Text style={codeStyle}>{code}</Text>
        </Section>
        <Text style={paragraph}>
          This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
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

ResetPasswordEmail.displayName = "ResetPasswordEmail"
export default ResetPasswordEmail;

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

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
};

const codeContainer = {
  background: '#f2f3f3',
  borderRadius: '4px',
  margin: '20px 0',
  padding: '20px',
  textAlign: 'center' as const,
};

const codeStyle = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#333',
};
