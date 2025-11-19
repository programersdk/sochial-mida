  // ==================== FIREBASE CONFIGURATION & INITIALIZATION ====================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  updateProfile,
  signOut 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { 
  getAnalytics, 
  logEvent 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyDH5Yrh1TQh6vAUzsh09rS1uIxWuTqUsUg",
    authDomain: "zakwan-social.firebaseapp.com",
    projectId: "zakwan-social",
    storageBucket: "zakwan-social.firebasestorage.app",
    messagingSenderId: "707047983009",
    appId: "1:707047983009:web:be9a1a9ad356b02bc22de0",
    measurementId: "G-4DN732N0Y8"
  };
// ==================== INITIALIZATION ====================
class FirebaseApp {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.analytics = getAnalytics(this.app);
    
    this._init();
  }

  _init() {
    // Configure analytics
    logEvent(this.analytics, 'firebase_init');
    
    // Set persistence if needed
    // setPersistence(this.auth, browserLocalPersistence);
  }

  // ==================== AUTH METHODS ====================
  async createUser(email, password, userData = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      // Update profile if display name provided
      if (userData.displayName) {
        await updateProfile(userCredential.user, {
          displayName: userData.displayName
        });
      }

      // Create user document in Firestore
      await this._createUserDocument(userCredential.user, userData);
      
      this._logEvent('sign_up', { method: 'email' });
      return userCredential;
    } catch (error) {
      this._handleError('CREATE_USER_ERROR', error);
      throw error;
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      this._logEvent('login', { method: 'email' });
      return userCredential;
    } catch (error) {
      this._handleError('SIGN_IN_ERROR', error);
      throw error;
    }
  }

  async signOutUser() {
    try {
      await signOut(this.auth);
      this._logEvent('logout');
    } catch (error) {
      this._handleError('SIGN_OUT_ERROR', error);
      throw error;
    }
  }

  // ==================== FIRESTORE METHODS ====================
  async _createUserDocument(user, additionalData = {}) {
    try {
      const userRef = doc(this.db, 'users', user.uid);
      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: additionalData.displayName || '',
        photoURL: additionalData.photoURL || '',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        ...additionalData
      };

      await setDoc(userRef, userDoc);
      return userRef;
    } catch (error) {
      this._handleError('CREATE_USER_DOC_ERROR', error);
      throw error;
    }
  }

  async getUserDocument(uid) {
    try {
      const userRef = doc(this.db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        throw new Error('User document not found');
      }
    } catch (error) {
      this._handleError('GET_USER_DOC_ERROR', error);
      throw error;
    }
  }

  async updateUserDocument(uid, updates) {
    try {
      const userRef = doc(this.db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      this._handleError('UPDATE_USER_DOC_ERROR', error);
      throw error;
    }
  }

  // ==================== FRIENDS SYSTEM ====================
  async sendFriendRequest(toUserId) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const requestRef = doc(this.db, 'friendRequests', `${currentUser.uid}_${toUserId}`);
      const requestData = {
        fromUserId: currentUser.uid,
        toUserId: toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(requestRef, requestData);
      
      // Update both users' pending requests
      await updateDoc(doc(this.db, 'users', currentUser.uid), {
        sentRequests: arrayUnion(toUserId)
      });

      await updateDoc(doc(this.db, 'users', toUserId), {
        pendingRequests: arrayUnion(currentUser.uid)
      });

      this._logEvent('send_friend_request');
    } catch (error) {
      this._handleError('SEND_FRIEND_REQUEST_ERROR', error);
      throw error;
    }
  }

  async acceptFriendRequest(fromUserId) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const requestRef = doc(this.db, 'friendRequests', `${fromUserId}_${currentUser.uid}`);
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Update both users' friend lists
      await updateDoc(doc(this.db, 'users', currentUser.uid), {
        friends: arrayUnion(fromUserId),
        pendingRequests: arrayRemove(fromUserId)
      });

      await updateDoc(doc(this.db, 'users', fromUserId), {
        friends: arrayUnion(currentUser.uid),
        sentRequests: arrayRemove(currentUser.uid)
      });

      this._logEvent('accept_friend_request');
    } catch (error) {
      this._handleError('ACCEPT_FRIEND_REQUEST_ERROR', error);
      throw error;
    }
  }

  async getFriendsList(uid) {
    try {
      const userDoc = await this.getUserDocument(uid);
      const friendIds = userDoc.friends || [];
      
      if (friendIds.length === 0) return [];

      const friendsQuery = query(
        collection(this.db, 'users'),
        where('uid', 'in', friendIds)
      );

      const querySnapshot = await getDocs(friendsQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      this._handleError('GET_FRIENDS_LIST_ERROR', error);
      throw error;
    }
  }

  async getFriendSuggestions(limitCount = 10) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const usersQuery = query(
        collection(this.db, 'users'),
        where('uid', '!=', currentUser.uid),
        orderBy('uid'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(usersQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      this._handleError('GET_FRIEND_SUGGESTIONS_ERROR', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================
  _logEvent(eventName, params = {}) {
    try {
      logEvent(this.analytics, eventName, params);
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  _handleError(context, error) {
    console.error(`[${context}]:`, error);
    
    // You can add error reporting service here (Sentry, etc.)
    // reportErrorToService(context, error);
  }

  // ==================== GETTERS ====================
  get currentUser() {
    return this.auth.currentUser;
  }

  get isAuthenticated() {
    return !!this.auth.currentUser;
  }
}

// ==================== SINGLETON INSTANCE ====================
const firebaseApp = new FirebaseApp();

// ==================== EXPORTS ====================
export {
  firebaseApp as default,
  FirebaseApp,
  onAuthStateChanged,
  // Core Firebase exports for advanced usage
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  onSnapshot
};