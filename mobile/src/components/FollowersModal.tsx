import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { GLASS_TOKENS } from '../theme';

interface User {
  id: string;
  name: string;
  username: string;
  bio: string;
  isFollowing: boolean;
}

interface FollowersModalProps {
  isVisible: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  count: number;
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'Alice Johnson', username: '@alice_j', bio: 'Photography enthusiast', isFollowing: true },
  { id: '2', name: 'Bob Smith', username: '@bob_smith', bio: 'Travel explorer', isFollowing: true },
  { id: '3', name: 'Charlie Brown', username: '@charlie_b', bio: 'Music producer', isFollowing: false },
  { id: '4', name: 'Diana Prince', username: '@diana_p', bio: 'Artist & designer', isFollowing: true },
  { id: '5', name: 'Evan Wilson', username: '@evan_w', bio: 'Tech enthusiast', isFollowing: true },
  { id: '6', name: 'Fiona Green', username: '@fiona_g', bio: 'Fitness coach', isFollowing: false },
  { id: '7', name: 'George Miller', username: '@george_m', bio: 'Writer', isFollowing: true },
  { id: '8', name: 'Hannah Lee', username: '@hannah_l', bio: 'Food blogger', isFollowing: true },
];

export default function FollowersModal({ isVisible, onClose, type, count }: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadUsers();
    }
  }, [isVisible, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setUsers(MOCK_USERS);
        setLoading(false);
      }, 300);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const handleFollowToggle = (userId: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user
      )
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <Pressable style={styles.userItem}>
      <View style={styles.userAvatarContainer}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>{item.username}</Text>
        <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
      </View>

      <Pressable
        style={[
          styles.followButton,
          item.isFollowing && styles.followingButton,
        ]}
        onPress={() => handleFollowToggle(item.id)}
      >
        <Text style={[styles.followButtonText, item.isFollowing && styles.followingButtonText]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    </Pressable>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {type === 'followers' ? `Followers (${count})` : `Following (${count})`}
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GLASS_TOKENS.colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {type} yet</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GLASS_TOKENS.colors.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: GLASS_TOKENS.colors.text,
  },
  closeButton: {
    padding: GLASS_TOKENS.spacing[2],
  },
  closeButtonText: {
    fontSize: 24,
    color: GLASS_TOKENS.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: GLASS_TOKENS.spacing[3],
    color: GLASS_TOKENS.colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: GLASS_TOKENS.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[2],
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GLASS_TOKENS.spacing[3],
  },
  userAvatarContainer: {
    marginRight: GLASS_TOKENS.spacing[3],
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GLASS_TOKENS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: GLASS_TOKENS.colors.base,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: GLASS_TOKENS.colors.text,
    marginBottom: GLASS_TOKENS.spacing[1],
  },
  userUsername: {
    fontSize: 12,
    color: GLASS_TOKENS.colors.textSecondary,
    marginBottom: GLASS_TOKENS.spacing[1],
  },
  userBio: {
    fontSize: 12,
    color: GLASS_TOKENS.colors.textSecondary,
  },
  followButton: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    borderRadius: GLASS_TOKENS.glass.radius.medium,
    backgroundColor: GLASS_TOKENS.colors.primary,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: GLASS_TOKENS.colors.primary,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: GLASS_TOKENS.colors.base,
  },
  followingButtonText: {
    color: GLASS_TOKENS.colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
