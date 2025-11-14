import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface, GlassChip, GlassButton, StoryRing } from '../components/glass';
import { TitleL, TitleM, BodyM, BodyS, Caption } from '../components/typography';
import { GLASS_TOKENS } from '../theme';
import FollowersModal from '../components/FollowersModal';

interface UserProfile {
  name: string;
  username: string;
  bio: string;
  momentCount: number;
  followersCount: number;
  followingCount: number;
  joinDate: string;
}

const DUMMY_PHOTOS = [
  { id: '1', uri: 'https://via.placeholder.com/200' },
  { id: '2', uri: 'https://via.placeholder.com/200' },
  { id: '3', uri: 'https://via.placeholder.com/200' },
  { id: '4', uri: 'https://via.placeholder.com/200' },
  { id: '5', uri: 'https://via.placeholder.com/200' },
  { id: '6', uri: 'https://via.placeholder.com/200' },
];

export default function ProfileScreen() {
  const [activeFilter, setActiveFilter] = useState<'posts' | 'tagged' | 'saved'>('posts');
  const [profile] = useState<UserProfile>({
    name: 'You',
    username: '@fuy_explorer',
    bio: 'Life is a collection of beautiful moments ✨',
    momentCount: 42,
    followersCount: 1024,
    followingCount: 386,
    joinDate: 'Joined Dec 2024',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const photoSize = (screenWidth - GLASS_TOKENS.spacing[8] * 2 - GLASS_TOKENS.spacing[2] * 2) / 3;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Header - Glass Container */}
          <GlassSurface
            variant="card"
            style={styles.headerCard}
            padding={{ horizontal: GLASS_TOKENS.spacing[4], vertical: GLASS_TOKENS.spacing[4] }}
            radius={GLASS_TOKENS.glass.radius.xl}
          >
            {/* Avatar & Info */}
            <View style={styles.profileTop}>
              <StoryRing
                size={80}
                ringWidth={3}
                hasStory={true}
                initial={profile.name.charAt(0)}
                placeholderColor={GLASS_TOKENS.colors.primary}
                gradientColors={[GLASS_TOKENS.colors.primary, GLASS_TOKENS.colors.secondary]}
              />

              <View style={{ flex: 1 }}>
                <TitleL>{profile.name}</TitleL>
                <BodyS contrast="low">{profile.username}</BodyS>
                <Caption contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[1] }}>
                  {profile.joinDate}
                </Caption>
              </View>
            </View>

            {/* Bio */}
            <BodyM style={{ marginTop: GLASS_TOKENS.spacing[3], marginBottom: GLASS_TOKENS.spacing[3] }}>
              {profile.bio}
            </BodyM>

            {/* Stats Row - Compact Pill Chips */}
            <View style={styles.statsRow}>
              <GlassChip
                label={`🎨 ${profile.momentCount} Posts`}
              />
              <Pressable onPress={() => setFollowersModalVisible(true)}>
                <GlassChip
                  label={`👥 ${profile.followersCount} Followers`}
                />
              </Pressable>
              <Pressable onPress={() => setFollowingModalVisible(true)}>
                <GlassChip
                  label={`🔗 ${profile.followingCount} Following`}
                />
              </Pressable>
            </View>

            {/* CTA Buttons */}
            <View style={styles.ctaRow}>
              <GlassButton
                variant="primary"
                label="Follow"
                size="medium"
                onPress={() => console.log('Follow')}
                fullWidth={false}
                style={{ flex: 1 }}
              />
              <GlassButton
                variant="secondary"
                label="Message"
                size="medium"
                onPress={() => console.log('Message')}
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
          </GlassSurface>

          {/* Content Filters - Glass Chips */}
          <View style={styles.filterRow}>
            <GlassChip
              label="Posts"
              selected={activeFilter === 'posts'}
              onPress={() => setActiveFilter('posts')}
            />
            <GlassChip
              label="Tagged"
              selected={activeFilter === 'tagged'}
              onPress={() => setActiveFilter('tagged')}
            />
            <GlassChip
              label="Saved"
              selected={activeFilter === 'saved'}
              onPress={() => setActiveFilter('saved')}
            />
          </View>

          {/* Photo Grid - Rounded Tiles with Generous Gutters */}
          <View style={styles.photoGridContainer}>
            <FlatList
              data={DUMMY_PHOTOS}
              numColumns={3}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              columnWrapperStyle={styles.photoRow}
              renderItem={() => (
                <View style={{ width: photoSize, height: photoSize }}>
                  <GlassSurface
                    variant="card"
                    style={styles.photoTile}
                    padding={0}
                    radius={GLASS_TOKENS.glass.radius.large}
                  />
                </View>
              )}
            />
          </View>

          {/* Settings Section */}
          <GlassSurface
            variant="card"
            style={styles.settingsCard}
            padding={{ horizontal: GLASS_TOKENS.spacing[4], vertical: GLASS_TOKENS.spacing[3] }}
            radius={GLASS_TOKENS.glass.radius.large}
          >
            <TitleM style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>
              Preferences
            </TitleM>

            {/* Notification Setting */}
            <View style={styles.settingRow}>
              <View>
                <BodyM>Notifications</BodyM>
                <BodyS contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[1] }}>
                  Get updates on new moments
                </BodyS>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: GLASS_TOKENS.glass.tint.light,
                  true: GLASS_TOKENS.colors.primary,
                }}
              />
            </View>
          </GlassSurface>

          {/* Bottom Spacing */}
          <View style={{ height: GLASS_TOKENS.spacing[8] }} />
        </ScrollView>
      </SafeAreaView>

      {/* Followers Modal */}
      <FollowersModal
        isVisible={followersModalVisible}
        onClose={() => setFollowersModalVisible(false)}
        type="followers"
        count={profile.followersCount}
      />

      {/* Following Modal */}
      <FollowersModal
        isVisible={followingModalVisible}
        onClose={() => setFollowingModalVisible(false)}
        type="following"
        count={profile.followingCount}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginHorizontal: GLASS_TOKENS.spacing[4],
    marginTop: GLASS_TOKENS.spacing[3],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GLASS_TOKENS.spacing[3],
  },

  statsRow: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[3],
    flexWrap: 'wrap',
  },

  ctaRow: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[3],
  },

  filterRow: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    justifyContent: 'center',
  },

  photoGridContainer: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  photoRow: {
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[2],
  },

  photoTile: {
    backgroundColor: '#F0F0F0',
  },

  settingsCard: {
    marginHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GLASS_TOKENS.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
});
