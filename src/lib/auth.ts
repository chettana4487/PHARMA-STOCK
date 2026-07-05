import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getSheetData, User } from './google-sheets';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const users = await getSheetData<User>('Users');
        const match = users.find(u => u.email.toLowerCase() === user.email?.toLowerCase());
        
        if (!match) {
          console.warn(`Sign-in rejected: ${user.email} not found in Users sheet`);
          return false; // Blocks access, redirects to error page
        }
        
        if (!match.active) {
          console.warn(`Sign-in rejected: ${user.email} is inactive`);
          return false; // Blocks access
        }
        
        return true; // Authorize
      } catch (error) {
        console.error('Error during signIn callback database validation:', error);
        return false;
      }
    },
    async jwt({ token }) {
      // Find role and ID dynamically for session storage
      if (token.email && !token.role) {
        try {
          const users = await getSheetData<User>('Users');
          const match = users.find(u => u.email.toLowerCase() === token.email?.toLowerCase());
          if (match) {
            token.role = match.role;
            token.userId = match.user_id;
            token.name = match.name || token.name;
          }
        } catch (error) {
          console.error('Error attaching role in JWT callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.userId = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirects back to login on error (e.g. access denied)
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 day session
  },
  secret: process.env.NEXTAUTH_SECRET,
};
