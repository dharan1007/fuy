/**
 * Navigation Service Interface
 * Provides abstraction for navigation throughout the app
 */

import { RootStackParamList, MainTabParamList } from './types';
import { NavigationProp } from '@react-navigation/native';

export interface INavigationService {
  navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
  ): void;

  navigateToTab<RouteName extends keyof MainTabParamList>(
    name: RouteName,
    params?: MainTabParamList[RouteName]
  ): void;

  goBack(): void;
  reset(routes: any[]): void;
}

export class NavigationService implements INavigationService {
  private navigationRef: NavigationProp<RootStackParamList> | null = null;

  setNavigationRef(ref: NavigationProp<RootStackParamList>) {
    this.navigationRef = ref;
  }

  navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
  ) {
    if (this.navigationRef?.isReady()) {
      this.navigationRef.navigate(name as any, params as any);
    }
  }

  navigateToTab<RouteName extends keyof MainTabParamList>(
    name: RouteName,
    params?: MainTabParamList[RouteName]
  ) {
    if (this.navigationRef?.isReady()) {
      this.navigationRef.navigate('MainTabs' as any, {
        screen: name as any,
        params: params as any,
      } as any);
    }
  }

  goBack() {
    if (this.navigationRef?.canGoBack()) {
      this.navigationRef.goBack();
    }
  }

  reset(routes: any[]) {
    if (this.navigationRef?.isReady()) {
      this.navigationRef.reset({
        index: 0,
        routes: routes,
      });
    }
  }
}

// Singleton instance
export const navigationService = new NavigationService();
