import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import * as ImagePicker from 'expo-image-picker';
import { GlassBackground, GlassSurface, GlassButton } from '../../components/glass';
import { TitleL, BodyL, BodyM, BodyS, Caption } from '../../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../../theme';
import SellerService from '../../services/sellerService';
import { SellerProfile } from '../../types/seller';

interface FormState {
  storeName: string;
  storeSlug: string;
  storeDescription: string;
  storeColor: string;
  email: string;
  phone: string;
  businessName: string;
  businessAddress: string;
}

export default function SellerStoreProfileScreen({ navigation, sellerId }: any) {
  const tokens = useGlassTokens();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState<FormState>({
    storeName: '',
    storeSlug: '',
    storeDescription: '',
    storeColor: '#6AA8FF',
    email: '',
    phone: '',
    businessName: '',
    businessAddress: '',
  });
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);

  const sellerService = new SellerService();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await sellerService.getSellerProfile(sellerId);
      setProfile(data);
      setForm({
        storeName: data.storeName || '',
        storeSlug: data.storeSlug || '',
        storeDescription: data.storeDescription || '',
        storeColor: data.storeColor || '#6AA8FF',
        email: data.email || '',
        phone: data.phone || '',
        businessName: data.businessName || '',
        businessAddress: data.businessAddress || '',
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(false);
      return;
    }

    try {
      setSlugChecking(true);
      const available = await sellerService.checkSlugAvailability(slug);
      setSlugAvailable(available);
    } catch (error) {
      setSlugAvailable(false);
    } finally {
      setSlugChecking(false);
    }
  };

  const handleSlugChange = (text: string) => {
    const slug = text.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setForm((f) => ({ ...f, storeSlug: slug }));
    checkSlugAvailability(slug);
  };

  const pickImage = async (type: 'logo' | 'banner') => {
    Alert.alert('Notice', 'Image upload is temporarily disabled to fix crash issues.');
  };

  const saveProfile = async () => {
    if (!form.storeName || !form.storeSlug || !form.email) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (!slugAvailable) {
      Alert.alert('Error', 'Store slug is not available');
      return;
    }

    try {
      setSaving(true);
      await sellerService.updateSellerProfile(sellerId, form);
      Alert.alert('Success', 'Profile updated successfully');
      loadProfile();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
          </View>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView scrollIndicatorInsets={{ right: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TitleL>Store Settings</TitleL>
            <Caption contrast="low">Manage your store profile and branding</Caption>
          </View>

          {/* Logo & Banner Section */}
          <View style={styles.section}>
            <BodyM style={[styles.sectionTitle, { marginBottom: GLASS_TOKENS.spacing[3] }]}>
              Store Branding
            </BodyM>

            {/* Logo */}
            <GlassSurface variant="card" style={styles.mediaCard}>
              <View style={styles.mediaHeader}>
                <BodyM style={{ fontWeight: '600' }}>Store Logo</BodyM>
                <BodyS contrast="low">Square (1:1)</BodyS>
              </View>
              {profile?.storeLogo && (
                <View style={styles.logoPreview}>
                  <BodyL style={{ fontSize: 48 }}>📸</BodyL>
                </View>
              )}
              <GlassButton
                variant="secondary"
                label={profile?.storeLogo ? 'Change Logo' : 'Upload Logo'}
                size="small"
                onPress={() => pickImage('logo')}
              />
            </GlassSurface>

            {/* Banner */}
            <GlassSurface variant="card" style={[styles.mediaCard, { marginTop: GLASS_TOKENS.spacing[3] }]}>
              <View style={styles.mediaHeader}>
                <BodyM style={{ fontWeight: '600' }}>Store Banner</BodyM>
                <BodyS contrast="low">Wide (16:9)</BodyS>
              </View>
              {profile?.storeBanner && (
                <View style={styles.bannerPreview}>
                  <BodyL style={{ fontSize: 48 }}>🖼️</BodyL>
                </View>
              )}
              <GlassButton
                variant="secondary"
                label={profile?.storeBanner ? 'Change Banner' : 'Upload Banner'}
                size="small"
                onPress={() => pickImage('banner')}
              />
            </GlassSurface>
          </View>

          {/* Store Info Section */}
          <View style={styles.section}>
            <BodyM style={[styles.sectionTitle, { marginBottom: GLASS_TOKENS.spacing[3] }]}>
              Store Information
            </BodyM>

            {/* Store Name */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Store Name *</Caption>
              <TextInput
                style={styles.input}
                placeholder="Your store name"
                placeholderTextColor="#E8E8F050"
                value={form.storeName}
                onChangeText={(text) => setForm((f) => ({ ...f, storeName: text }))}
                editable={!saving}
              />
            </View>

            {/* Store Slug */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Store URL *</Caption>
              <View style={styles.slugContainer}>
                <BodyS style={styles.slugPrefix}>yourapp.com/store/</BodyS>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="unique-slug"
                  placeholderTextColor="#E8E8F050"
                  value={form.storeSlug}
                  onChangeText={handleSlugChange}
                  editable={!saving && !slugChecking}
                />
                {slugChecking && <ActivityIndicator size="small" color={tokens.colors.primary} />}
                {!slugChecking && slugAvailable && (
                  <BodyS style={{ color: '#2ECC71' }}>✓</BodyS>
                )}
                {!slugChecking && !slugAvailable && form.storeSlug.length >= 3 && (
                  <BodyS style={{ color: '#FF6B6B' }}>✗</BodyS>
                )}
              </View>
              {!slugAvailable && form.storeSlug.length >= 3 && (
                <Caption style={{ color: '#FF6B6B', marginTop: GLASS_TOKENS.spacing[1] }}>
                  This slug is already taken
                </Caption>
              )}
            </View>

            {/* Store Description */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Store Description</Caption>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="Tell customers about your store..."
                placeholderTextColor="#E8E8F050"
                value={form.storeDescription}
                onChangeText={(text) => setForm((f) => ({ ...f, storeDescription: text }))}
                multiline
                editable={!saving}
              />
            </View>

            {/* Store Color */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Primary Color</Caption>
              <View style={styles.colorPicker}>
                {[
                  '#6AA8FF',
                  '#FF6B9D',
                  '#38D67A',
                  '#FFB366',
                  '#B88FFF',
                  '#FF6B6B',
                ].map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      form.storeColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, storeColor: color }))}
                  >
                    {form.storeColor === color && (
                      <BodyS style={{ color: '#FFFFFF', fontWeight: '700' }}>✓</BodyS>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Contact Info Section */}
          <View style={styles.section}>
            <BodyM style={[styles.sectionTitle, { marginBottom: GLASS_TOKENS.spacing[3] }]}>
              Contact Information
            </BodyM>

            {/* Email */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Email *</Caption>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#E8E8F050"
                value={form.email}
                onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
                editable={!saving}
                keyboardType="email-address"
              />
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Phone Number</Caption>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#E8E8F050"
                value={form.phone}
                onChangeText={(text) => setForm((f) => ({ ...f, phone: text }))}
                editable={!saving}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Business Info Section */}
          <View style={styles.section}>
            <BodyM style={[styles.sectionTitle, { marginBottom: GLASS_TOKENS.spacing[3] }]}>
              Business Information
            </BodyM>

            {/* Business Name */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Business Name</Caption>
              <TextInput
                style={styles.input}
                placeholder="Legal business name"
                placeholderTextColor="#E8E8F050"
                value={form.businessName}
                onChangeText={(text) => setForm((f) => ({ ...f, businessName: text }))}
                editable={!saving}
              />
            </View>

            {/* Business Address */}
            <View style={styles.formGroup}>
              <Caption style={styles.label}>Business Address</Caption>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Full business address"
                placeholderTextColor="#E8E8F050"
                value={form.businessAddress}
                onChangeText={(text) => setForm((f) => ({ ...f, businessAddress: text }))}
                multiline
                editable={!saving}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <GlassButton
              variant="primary"
              label={saving ? 'Saving...' : 'Save Changes'}
              onPress={saveProfile}
              disabled={saving}
            />
            <GlassButton
              variant="secondary"
              label="Cancel"
              onPress={() => navigation?.goBack()}
              disabled={saving}
            />
          </View>

          <View style={{ height: GLASS_TOKENS.spacing[8] }} />
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[4],
  },

  section: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[5],
  },

  sectionTitle: {
    fontWeight: '600',
  },

  mediaCard: {
    padding: GLASS_TOKENS.spacing[4],
  },

  mediaHeader: {
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: GLASS_TOKENS.spacing[3],
    backgroundColor: '#FFFFFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: GLASS_TOKENS.spacing[3],
    backgroundColor: '#FFFFFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  formGroup: {
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  label: {
    marginBottom: GLASS_TOKENS.spacing[2],
    display: 'flex',
  },

  input: {
    backgroundColor: '#FFFFFF10',
    borderRadius: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[3],
    color: '#E8E8F0',
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    fontSize: 14,
    fontFamily: 'System',
  },

  slugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF10',
    borderRadius: GLASS_TOKENS.spacing[2],
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
  },

  slugPrefix: {
    color: '#E8E8F070',
  },

  colorPicker: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[3],
  },

  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  actionSection: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[4],
  },
});
