import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  JournalDetail: { id: string };
  PostDetail: { id: string };
  ChatScreen: { conversationId: string };
  ProductDetail: { id: string };
  Checkout: { items: any[] };
  MapScreen: { initialLocation?: { lat: number; lng: number } };
  Settings: undefined;
  ProfileEdit: undefined;
  CreatePost: undefined;
  CreateJournal: undefined;
  RoutineDetail?: { routineId?: string };
  GuideDetail?: { feature?: string; guide?: any; level?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Journal: undefined;
  Essenz: undefined;
  Social: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};
