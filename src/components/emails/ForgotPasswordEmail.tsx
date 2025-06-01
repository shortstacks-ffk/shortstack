import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ForgotPasswordEmailProps {
  firstName: string;
  verificationCode: string;
  appUrl: string;
}

const ForgotPasswordEmail: React.FC<ForgotPasswordEmailProps> = ({
  firstName,
  verificationCode,
  appUrl,
}) => {
  // Styles
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  };

  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  };

  const logo = {
    margin: '0 auto',
    width: '180px',
    height: 'auto',
  };

  const verificationCodeContainer = {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #e9e9e9',
    borderRadius: '4px',
    margin: '16px 0',
    fontSize: '24px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    letterSpacing: '4px',
  };

  return (
    <Html>
      <Head />
      <Preview>Your ShortStack Password Reset Code: {verificationCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src='https://tskrok7zgyvtkooz.public.blob.vercel-storage.com/email-img/Primary%20Logo%20-%20Colorfu%20Black%20Greenldpi-Z9Tg75sXXXCVq53ftu7yjOH9O5f9dQ.png'
            width="180"
            height="auto"
            alt="ShortStack"
            style={logo}
          />
          <Heading as="h1">Password Reset Request</Heading>
          <Text>Hi {firstName},</Text>
          <Text>
            We received a request to reset the password for your ShortStack account. Please use the verification code below to complete the password reset process:
          </Text>
          <Section style={verificationCodeContainer}>{verificationCode}</Section>
          <Text>
            This verification code will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </Text>
          <Text>
            After entering this code, you'll be able to create a new password for your account.
          </Text>
          <Hr />
          <Text style={{ color: '#666', fontSize: '14px' }}>
            If you're having trouble, you can contact our support team at{' '}
            <Link href="mailto:support@shortstacksffk.com">support@shortstacksffk.com</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ForgotPasswordEmail;