// ==================== FRIENDS MANAGER ====================
import firebaseApp, { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp
} from '../config/config.js';

class FriendsManager {
  constructor() {
    this.friends = [];
    this.pendingRequests = [];
    this.sentRequests = [];
    this.suggestions = [];
  }

  // Send friend request
  async sendFriendRequest(toUserId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Prevent sending request to self
      if (currentUser.uid === toUserId) {
        throw new Error('Cannot send friend request to yourself');
      }

      const requestId = `${currentUser.uid}_${toUserId}`;
      const requestRef = doc(firebaseApp.db, 'friend_requests', requestId);

      // Check if request already exists
      const existingRequest = await getDoc(requestRef);
      if (existingRequest.exists()) {
        throw new Error('Friend request already sent');
      }

      const requestData = {
        senderId: currentUser.uid,
        receiverId: toUserId,
        status: 'pending',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await setDoc(requestRef, requestData);

      // Update both users' documents
      await updateDoc(doc(firebaseApp.db, 'users', currentUser.uid), {
        sentRequests: arrayUnion(toUserId)
      });

      await updateDoc(doc(firebaseApp.db, 'users', toUserId), {
        pendingRequests: arrayUnion(currentUser.uid)
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }
  }

  // Accept friend request
  async acceptFriendRequest(fromUserId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const requestId = `${fromUserId}_${currentUser.uid}`;
      const requestRef = doc(firebaseApp.db, 'friend_requests', requestId);

      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Create friendship connection
      const friendshipId1 = `${currentUser.uid}_${fromUserId}`;
      const friendshipId2 = `${fromUserId}_${currentUser.uid}`;

      await setDoc(doc(firebaseApp.db, 'friends', friendshipId1), {
        userId: currentUser.uid,
        friendId: fromUserId,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(firebaseApp.db, 'friends', friendshipId2), {
        userId: fromUserId,
        friendId: currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Update both users' friends lists
      await updateDoc(doc(firebaseApp.db, 'users', currentUser.uid), {
        friends: arrayUnion(fromUserId),
        pendingRequests: arrayRemove(fromUserId)
      });

      await updateDoc(doc(firebaseApp.db, 'users', fromUserId), {
        friends: arrayUnion(currentUser.uid),
        sentRequests: arrayRemove(currentUser.uid)
      });

      return { success: true };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject/Delete friend request
  async rejectFriendRequest(fromUserId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const requestId = `${fromUserId}_${currentUser.uid}`;
      const requestRef = doc(firebaseApp.db, 'friend_requests', requestId);

      await deleteDoc(requestRef);

      // Update both users' documents
      await updateDoc(doc(firebaseApp.db, 'users', currentUser.uid), {
        pendingRequests: arrayRemove(fromUserId)
      });

      await updateDoc(doc(firebaseApp.db, 'users', fromUserId), {
        sentRequests: arrayRemove(currentUser.uid)
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove friend
  async removeFriend(friendId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const friendshipId1 = `${currentUser.uid}_${friendId}`;
      const friendshipId2 = `${friendId}_${currentUser.uid}`;

      // Delete friendship documents
      await deleteDoc(doc(firebaseApp.db, 'friends', friendshipId1));
      await deleteDoc(doc(firebaseApp.db, 'friends', friendshipId2));

      // Update both users' friends lists
      await updateDoc(doc(firebaseApp.db, 'users', currentUser.uid), {
        friends: arrayRemove(friendId)
      });

      await updateDoc(doc(firebaseApp.db, 'users', friendId), {
        friends: arrayRemove(currentUser.uid)
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: error.message };
    }
  }

  // Get friends list
  async getFriendsList() {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const userData = await firebaseApp.getUserDocument(currentUser.uid);
      const friendIds = userData.friends || [];

      if (friendIds.length === 0) {
        this.friends = [];
        return [];
      }

      // Get friends data
      const friendsData = [];
      for (const friendId of friendIds) {
        try {
          const friendData = await firebaseApp.getUserDocument(friendId);
          friendsData.push(friendData);
        } catch (error) {
          console.error(`Error getting friend ${friendId}:`, error);
        }
      }

      this.friends = friendsData;
      return friendsData;
    } catch (error) {
      console.error('Error getting friends list:', error);
      return [];
    }
  }

  // Get pending friend requests
  async getPendingRequests() {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const requestsQuery = query(
        collection(firebaseApp.db, 'friend_requests'),
        where('receiverId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(requestsQuery);
      const requests = [];

      for (const docSnap of querySnapshot.docs) {
        const requestData = docSnap.data();
        try {
          const senderData = await firebaseApp.getUserDocument(requestData.senderId);
          requests.push({
            ...requestData,
            senderData
          });
        } catch (error) {
          console.error(`Error getting sender ${requestData.senderId}:`, error);
        }
      }

      this.pendingRequests = requests;
      return requests;
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }

  // Get friend suggestions
  async getFriendSuggestions(limitCount = 10) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const userData = await firebaseApp.getUserDocument(currentUser.uid);
      const friends = userData.friends || [];
      const sentRequests = userData.sentRequests || [];
      const pendingRequests = userData.pendingRequests || [];

      // Get all users
      const usersSnapshot = await getDocs(collection(firebaseApp.db, 'users'));
      
      const suggestions = usersSnapshot.docs
        .map(doc => doc.data())
        .filter(user => 
          user.uid !== currentUser.uid && 
          !friends.includes(user.uid) &&
          !sentRequests.includes(user.uid) &&
          !pendingRequests.includes(user.uid)
        )
        .slice(0, limitCount);

      this.suggestions = suggestions;
      return suggestions;
    } catch (error) {
      console.error('Error getting friend suggestions:', error);
      return [];
    }
  }

  // Check friendship status
  async getFriendshipStatus(userId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return 'none';

      const userData = await firebaseApp.getUserDocument(currentUser.uid);
      
      if (userData.friends?.includes(userId)) return 'friends';
      if (userData.sentRequests?.includes(userId)) return 'request_sent';
      if (userData.pendingRequests?.includes(userId)) return 'request_received';
      
      return 'none';
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return 'none';
    }
  }
}

// Create singleton instance
const friendsManager = new FriendsManager();

export default friendsManager;
