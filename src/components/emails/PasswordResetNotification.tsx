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
import { Tailwind } from '@react-email/tailwind';

interface PasswordResetNotificationProps {
  firstName: string;
  lastName: string;
  appUrl: string;
  // We don't include the password for security
}

export default function PasswordResetNotification({ 
  firstName,
  lastName,
  appUrl
}: PasswordResetNotificationProps) {
  // Styles
  const main = {
    backgroundColor: '#ffffff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  };

  const container = {
    margin: '0 auto',
    padding: '24px',
    maxWidth: '600px',
  };

  const header = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0 24px 0',
  };

  const logo = {
    height: '45px',
  };

  const contentBox = {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const warningText = {
    color: '#b91c1c', // red-700
    backgroundColor: '#fee2e2', // red-100
    padding: '12px',
    borderRadius: '4px',
    marginTop: '16px',
  };

  const footer = {
    padding: '16px 0',
    color: '#4b5563', // gray-600
    textAlign: 'center' as const,
    fontSize: '14px',
  };

  return (
    <Html>
      <Head />
      <Preview>Important security notification: Your ShortStack password was changed</Preview>
      <Tailwind>
        <Body style={main}>
          <Container style={container}>
            {/* Header */}
            <Section style={header}>
              <Img
                src='https://tskrok7zgyvtkooz.public.blob.vercel-storage.com/email-img/Primary%20Logo%20-%20Colorful%20Orangeldpi-0tET7Jj9hBKRsLSSOV9e6gX1F4vuDv.png'
                alt="ShortStack Logo"
                style={logo}
              />
            </Section>
            
            {/* Content */}
            <Section style={contentBox}>
              <Heading className="text-2xl font-bold mb-4 text-gray-800">
                Password Change Notification
              </Heading>
              
              <Text className="mb-4 text-gray-700">
                Hello {firstName} {lastName},
              </Text>
              
              <Text className="mb-4 text-gray-700">
                This is a confirmation that your ShortStack account password was recently changed. 
              </Text>
              
              <Text style={warningText}>
                <strong>Important:</strong> If you did not make this change, please contact your administrator 
                immediately and secure your account by resetting your password.
              </Text>
              
              <Hr className="my-6 border-gray-200" />
              
              <Text className="text-gray-700 mb-4">
                You can access your ShortStack account at any time by visiting:
              </Text>
              
              <Section className="mb-6">
                <Link
                  href={`${appUrl}/login`}
                  className="bg-orange-500 text-white px-6 py-3 rounded-md font-medium no-underline inline-block"
                >
                  Log In to ShortStack
                </Link>
              </Section>
              
              <Text className="text-gray-700">
                Thank you for using ShortStack for your education needs!
              </Text>
            </Section>

            {/* Footer */}
            <Text style={footer}>
              © {new Date().getFullYear()} ShortStack Education. All rights reserved.
              <br />
              This is an automated message, please do not reply.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}