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

interface RechargeConfirmationEmailProps {
  name: string;
  attemptsAdded: number;
  newQuota: number;
  isAgency: boolean;
}

const baseUrl = 'https://app.precasprep.com';

export const RechargeConfirmationEmail = ({
  name,
  attemptsAdded,
  newQuota,
  isAgency,
}: RechargeConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your precasprep quota has been recharged
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
          Your purchase was successful! We've added <strong>{attemptsAdded} interview attempts</strong> to your {isAgency ? 'agency' : ''} account.
        </Text>
        <Text style={paragraph}>
          Your new total balance is <strong>{newQuota} attempts</strong>.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={`${baseUrl}/dashboard`}>
            Go to My Dashboard
          </Button>
        </Section>
        <Text style={paragraph}>
          Happy practicing!
          <br />
          The precasprep Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you have any questions about your purchase, please contact our support team at support@precasprep.com.
        </Text>
      </Container>
    </Body>
  </Html>
);

RechargeConfirmationEmail.displayName = "RechargeConfirmationEmail";
export default RechargeConfirmationEmail;


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
