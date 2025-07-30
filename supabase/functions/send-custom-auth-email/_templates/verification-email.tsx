import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface VerificationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  userName?: string
}

export const VerificationEmail = ({
  token_hash,
  supabase_url,
  email_action_type,
  redirect_to,
  userName,
}: VerificationEmailProps) => (
  <Html>
    <Head>
      <script dangerouslySetInnerHTML={{
        __html: `
          function handleVerification() {
            // Check if this was opened from another tab
            if (window.opener) {
              // This was opened in a new tab, focus the original tab and close this one
              window.opener.focus();
              window.close();
            }
          }
          
          // Run when page loads
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleVerification);
          } else {
            handleVerification();
          }
        `
      }} />
    </Head>
    <Preview>Verify your email to complete your CalmlySettled registration</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <div style={logoContainer}>
            <div style={logoIcon}>🏠</div>
            <Text style={logoText}>CalmlySettled</Text>
          </div>
        </Section>
        
        <Heading style={h1}>Welcome{userName ? ` ${userName}` : ''}!</Heading>
        
        <Text style={text}>
          Thanks for joining CalmlySettled! We're excited to help you discover the best places in your new neighborhood.
        </Text>
        
        <Text style={text}>
          To complete your registration and start getting personalized recommendations, please verify your email address by clicking the button below:
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(`${redirect_to}?verified=true`)}`}
            style={button}
          >
            Verify Email Address
          </Link>
        </Section>
        
        <Text style={smallText}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(`${redirect_to}?verified=true`)}`}
        </Text>
        
        <Text style={footerText}>
          If you didn't create an account with CalmlySettled, you can safely ignore this email.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            Happy settling,<br />
            The CalmlySettled Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default VerificationEmail

const main = {
  backgroundColor: '#f6f9fc',
  margin: '0 auto',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  margin: '40px auto',
  padding: '40px 20px',
  width: '465px',
}

const header = {
  marginBottom: '32px',
}

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
}

const logoIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
}

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  minWidth: '200px',
}

const smallText = {
  color: '#6a6a6a',
  fontSize: '14px',
  margin: '24px 0 8px',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#667eea',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
}

const footerText = {
  color: '#8a8a8a',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}

const footer = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: '24px',
  marginTop: '32px',
}