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

interface WelcomeEmailProps {
  name: string;
  email: string;
  plan: string;
  tempPassword?: string;
}

const baseUrl = 'https://precasprep.com';

export const WelcomeEmail = ({
  name,
  email,
  plan,
  tempPassword,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Welcome to precasprep! Here are your login details.
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
          Thank you for signing up for the {plan} plan with precasprep! We're excited to have you on board.
        </Text>
        <Section style={credentialsSection}>
          <Text style={credentialsText}>Here are your login credentials:</Text>
          <Text style={credentialsDetail}>
            <strong>Username:</strong> {email}
          </Text>
          <Text style={credentialsDetail}>
            <strong>Temporary Password:</strong> {tempPassword}
          </Text>
        </Section>
        <Text style={paragraph}>
          We recommend changing your password after your first login for security.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href="https://app.precasprep.com">
            Login to Your Account
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

WelcomeEmail.displayName = "WelcomeEmail"
export default WelcomeEmail;

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

const credentialsSection = {
    backgroundColor: '#f2f3f3',
    border: '1px solid #d9d9d9',
    borderRadius: '4px',
    padding: '20px',
    margin: '20px 0'
}

const credentialsText = {
    ...paragraph,
    fontWeight: 'bold' as const,
    marginBottom: '15px'
}

const credentialsDetail = {
    ...paragraph,
    margin: '0 0 10px 0'
}
