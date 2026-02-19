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
  resetLink: string;
}

const baseUrl = 'https://precasprep.com';

export const ResetPasswordEmail = ({
  name,
  resetLink,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Reset your precasprep password
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
          Someone recently requested a password change for your precasprep account. If this was you, you can set a new password here:
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={resetLink}>
            Reset Password
          </Button>
        </Section>
        <Text style={paragraph}>
          If you don't want to change your password or didn't request this, just ignore and delete this message.
        </Text>
        <Text style={paragraph}>
          To keep your account secure, please don't forward this email to anyone.
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