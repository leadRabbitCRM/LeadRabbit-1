import NextAuth from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

export default async function auth(req, res) {
  // Read the existing appToken from cookie
  const appToken = req.cookies.appToken;

  // Optional: reset the cookie after login so middleware sees it
  if (appToken) {
    const isProduction = process.env.NODE_ENV === "production";
    const securePart = isProduction ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `appToken=${appToken}; Path=/; HttpOnly; SameSite=Lax${securePart}`,
    );
  }

  return NextAuth(req, res, {
    providers: [
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        authorization: {
          params: {
            scope:
              "public_profile,email,pages_show_list,pages_read_engagement,",
          },
        },
      }),
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope:
              "openid email profile https://www.googleapis.com/auth/calendar",
          },
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          token.accessToken = account.access_token;
          token.provider = account.provider;
        }
        return token;
      },
      async session({ session, token }) {
        session.accessToken = token.accessToken;
        session.provider = token.provider;
        return session;
      },
    },
  });
}
