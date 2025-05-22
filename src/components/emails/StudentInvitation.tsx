import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Img
} from '@react-email/components';

interface StudentInvitationProps {
  firstName: string;
  lastName: string;
  className: string;
  classCode: string;
  email: string;
  password?: string;
  isNewStudent: boolean;
  appUrl: string;
  isPasswordReset?: boolean;
}

export const StudentInvitation: React.FC<StudentInvitationProps> = ({
  firstName,
  lastName,
  className,
  classCode,
  email,
  password,
  isNewStudent,
  appUrl = 'http://localhost:3000',
  isPasswordReset = false,
}) => {
  // Determine the message type for preview and content
  let previewText = '';
  let headerTitle = '';
  let contentMessage = '';

  if (isPasswordReset) {
    previewText = `Your ShortStack password has been updated`;
    headerTitle = 'Password Updated';
    contentMessage = `Your password for ${className} has been updated by your teacher. Below are your new login credentials:`;
  } else if (isNewStudent) {
    previewText = `Welcome to ${className}! Here are your login credentials.`;
    headerTitle = 'Welcome!';
    contentMessage = `You have been added to ${className} by your teacher. Below are your login credentials:`;
  } else {
    previewText = `You've been added to ${className}.`;
    headerTitle = 'New Class Added!';
    contentMessage = `You have been added to a new class: ${className}.`;
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Integrated header with logo */}
          <Section style={header}>
            <Img
              src={`${appUrl}/assets/img/logo simple - greenldpi.png`}
              width="150"
              height="40"
              alt="ShortStack Education"
              style={logo}
            />
            <Heading style={headerText}>ShortStacks FFK</Heading>
          </Section>
          
          {/* Main Content - Optimized for viewport */}
          <Section style={section}>
            <Heading as="h2" style={subheading}>
              {headerTitle}
            </Heading>
            
            <Text style={text}>
              Hello {firstName} {lastName},
            </Text>
            
            <Text style={text}>
              {contentMessage}
            </Text>
            
            {/* Content Sections */}
            <Section style={contentContainer}>
              {/* Show credentials for new students or password resets */}
              {(isNewStudent || isPasswordReset) && password && (
                <Section style={credentialsBox}>
                  <Text style={credentialItem}>
                    <strong>Email:</strong> {email}
                  </Text>
                  <Text style={credentialItem}>
                    <strong>Password:</strong> {password}
                  </Text>
                  <Text style={credentialItem}>
                    <strong>Class Code:</strong> {classCode}
                  </Text>
                </Section>
              )}
              
              {/* For existing students being added to a class */}
              {!isNewStudent && !isPasswordReset && (
                <Section style={credentialsBox}>
                  <Text style={credentialItem}>
                    <strong>Class Code:</strong> {classCode}
                  </Text>
                  <Text style={credentialItem}>
                    Please use your existing login credentials.
                  </Text>
                </Section>
              )}
              
              {/* Additional security message for password resets */}
              {isPasswordReset && (
                <Text style={warningText}>
                  If you did not expect this password change, please contact your teacher immediately.
                </Text>
              )}
            </Section>
            
            {/* Mascot Image - Positioned to the side */}
            <Section style={sideImageContainer}>
              <Img
                src={`${appUrl}/assets/img/Mascout 9ldpi.png`}
                width="100"
                height="100"
                alt="ShortStack Mascot"
                style={mascotImage}
              />
            </Section>
            
            {/* Call to action */}
            <Section style={ctaContainer}>
              <Text style={text}>
                Please log in to {isPasswordReset ? 'access your account' : 'join the class'} using the provided information.
              </Text>
              
              <Link href={`${appUrl}/student`} style={button}>
                Login to ShortStack
              </Link>
            </Section>
          </Section>
          
          <Hr style={hr} />
          
          {/* Footer - Simplified for better fit */}
          <Section style={footerContainer}>
            <Text style={footer}>
              © {new Date().getFullYear()} ShortStacks Finance For Kids. All rights reserved.
            </Text>
            <Text style={footerSmall}>
              This is an automated message. Please do not reply.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Improved styling for better viewport fit and visual hierarchy
const main = {
  backgroundColor: '#f0f7f0', 
  fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  padding: '10px 0',
  margin: 0,
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #dcedc8',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  maxHeight: '100vh',
  overflow: 'auto',
};

const header = {
  backgroundColor: '#4caf50',
  color: '#ffffff',
  padding: '15px',
  textAlign: 'center' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
};

const headerText = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '8px 0 0 0',
};

const logo = {
  margin: '0 auto',
};

const section = {
  padding: '20px',
};

const contentContainer = {
  marginBottom: '15px',
  position: 'relative' as const,
};

const sideImageContainer = {
  textAlign: 'center' as const,
  margin: '0',
};

const mascotImage = {
  margin: '0 auto',
};

const subheading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#388e3c',
  marginBottom: '15px',
};

const text = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#424242',
  marginBottom: '12px',
};

const credentialsBox = {
  backgroundColor: '#f1f8e9',
  padding: '15px',
  borderRadius: '6px',
  margin: '15px 0',
  border: '1px solid #c5e1a5',
};

const credentialItem = {
  fontSize: '15px',
  margin: '6px 0',
  color: '#424242',
};

const warningText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#d32f2f',
  marginTop: '12px',
  marginBottom: '12px',
};

const ctaContainer = {
  textAlign: 'center' as const,
  margin: '15px 0',
};

const button = {
  backgroundColor: '#43a047',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontWeight: 'bold',
  margin: '15px 0',
  padding: '10px 20px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  fontSize: '16px',
};

const hr = {
  borderColor: '#e8f5e9',
  margin: '10px 0',
};

const footerContainer = {
  padding: '10px 20px 15px',
  backgroundColor: '#f9fbf9',
  borderBottomLeftRadius: '8px',
  borderBottomRightRadius: '8px',
};

const footer = {
  color: '#789d7a',
  fontSize: '13px',
  textAlign: 'center' as const,
  marginBottom: '5px',
};

const footerSmall = {
  color: '#9e9e9e',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '0',
};

export default StudentInvitation;