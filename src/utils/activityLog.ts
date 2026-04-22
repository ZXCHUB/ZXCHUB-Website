import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

type ActorProfile = {
  uid?: string;
  displayName?: string;
  email?: string;
  role?: string;
};

type ActivityPayload = {
  action: string;
  targetType: 'script' | 'ticket' | 'comment' | 'reply' | 'system';
  targetId?: string;
  targetTitle?: string;
  details?: string;
};

export async function logActivity(actor: ActorProfile | null | undefined, payload: ActivityPayload) {
  if (!actor?.uid) return;

  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...payload,
      actorId: actor.uid,
      actorName: actor.displayName || actor.email || 'Team member',
      actorEmail: actor.email || '',
      actorRole: actor.role || 'team',
      createdAt: Date.now()
    });
  } catch (error) {
    console.warn('Failed to write activity log', error);
  }
}
