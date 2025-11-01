import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || Constants.expoConfig?.extra?.googleClientId;

interface GoogleSignInResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    photo: string | null;
  };
  idToken: string;
}

export const useGoogleSignIn = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: 'algopulse',
      path: 'auth',
    }),
  });

  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { id_token } = result.params;

        const credential = GoogleAuthProvider.credential(id_token);
        const firebaseResult = await signInWithCredential(auth, credential);
        const user = firebaseResult.user;

        return {
          user: {
            id: user.uid,
            email: user.email || '',
            name: user.displayName,
            photo: user.photoURL,
          },
          idToken: id_token || '',
        };
      } else {
        throw new Error('Google sign-in was cancelled');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  return {
    signInWithGoogle,
    isLoading: !request,
  };
};

export default { useGoogleSignIn };

