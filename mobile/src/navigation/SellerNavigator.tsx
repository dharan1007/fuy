import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import seller screens
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import SellerStoreProfileScreen from '../screens/seller/SellerStoreProfileScreen';
import OrdersScreen from '../screens/seller/OrdersScreen';
import WithdrawalsScreen from '../screens/seller/WithdrawalsScreen';
import ProductManagementScreen from '../screens/seller/ProductManagementScreen';

// Import admin screens
import ModerationDashboardScreen from '../screens/admin/ModerationDashboardScreen';

export type SellerStackParamList = {
  Dashboard: { sellerId: string };
  StoreProfile: { sellerId: string };
  Orders: { sellerId: string };
  OrderDetails: { orderId: string };
  Withdrawals: { sellerId: string };
  ProductManagement: { sellerId: string };
  CreateProduct: { sellerId: string };
  EditProduct: { productId: string; sellerId: string };
  ProductDetails: { productId: string };
};

export type AdminStackParamList = {
  ModerationDashboard: { adminId: string };
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

export function SellerNavigator({ sellerId }: { sellerId: string }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={SellerDashboardScreen}
        initialParams={{ sellerId }}
      />
      <Stack.Screen
        name="StoreProfile"
        component={SellerStoreProfileScreen}
        initialParams={{ sellerId }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        initialParams={{ sellerId }}
      />
      <Stack.Screen
        name="Withdrawals"
        component={WithdrawalsScreen}
        initialParams={{ sellerId }}
      />
      <Stack.Screen
        name="ProductManagement"
        component={ProductManagementScreen}
        initialParams={{ sellerId }}
      />
    </Stack.Navigator>
  );
}

const AdminStack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator({ adminId }: { adminId: string }) {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <AdminStack.Screen
        name="ModerationDashboard"
        component={ModerationDashboardScreen}
        initialParams={{ adminId }}
      />
    </AdminStack.Navigator>
  );
}
