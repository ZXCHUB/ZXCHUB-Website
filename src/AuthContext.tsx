import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user' | 'moderator';
  discordId?: string;
  discordUsername?: string;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  createdAt?: number;
  lastIp?: string;
  lastCountry?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<any>;
  linkDiscord: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const linkDiscord = () => new Promise<void>((resolve, reject) => {
    if (!auth.currentUser) {
      reject(new Error('Sign in before linking Discord.'));
      return;
    }

    const popup = window.open(
      `/api/discord/auth-url?uid=${encodeURIComponent(auth.currentUser.uid)}`,
      'zxchub-discord-link',
      'width=520,height=720'
    );

    if (!popup) {
      reject(new Error('Popup was blocked. Allow popups and try again.'));
      return;
    }

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(checkClosed);
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'discord_auth_success') return;

      try {
        await updateDoc(doc(db, 'users', auth.currentUser!.uid), event.data.data);
        cleanup();
        popup.close();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    const checkClosed = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Discord linking was cancelled.'));
      }
    }, 700);

    window.addEventListener('message', handleMessage);
  });

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          const isAdminEmail = firebaseUser.email === 'zxchubadmin@gmail.com';

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
          } else {
            const defaultName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'New User';
            
            let lastIp = '';
            let lastCountry = '';
            try {
              const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
              const data = await res.json();
              lastIp = data.ip || '';
              lastCountry = data.country || '';
            } catch (error) {
              console.error('Failed to fetch IP info', error);
            }

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || defaultName,
              photoURL: firebaseUser.photoURL || '',
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: Date.now(),
              lastIp,
              lastCountry
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login: loginWithGoogle, linkDiscord, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
