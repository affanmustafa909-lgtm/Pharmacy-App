import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AiScreen from '@/app/(tabs)/ai';
import CartScreen from '@/app/(tabs)/cart';
import HomeScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profile';
import AddressesScreen from '@/app/addresses';
import CheckoutScreen from '@/app/checkout';
import NotificationsScreen from '@/app/notifications';
import OrderSuccessScreen from '@/app/order-success';
import OrdersScreen from '@/app/orders';
import PharmaciesScreen from '@/app/pharmacies';
import PrescriptionsScreen from '@/app/prescriptions';
import ProductScreen from '@/app/product/[id]';
import RemindersScreen from '@/app/reminders';
import ScanScreen from '@/app/scan';
import SearchScreen from '@/app/search';
import TrackOrderScreen from '@/app/track-order';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { AppProvider } from '@/context/AppContext';
import { navigationRef } from '@/navigation/router';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function TabsNavigator() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" component={HomeScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Tabs.Screen name="ai" component={AiScreen} options={{ title: 'AI' }} />
      <Tabs.Screen name="profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
                animationDuration: 320,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            >
              <Stack.Screen name="Tabs" component={TabsNavigator} />
              <Stack.Screen
                name="Scan"
                component={ScanScreen}
                options={{ animation: 'slide_from_bottom', animationDuration: 380 }}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
              />
              <Stack.Screen
                name="Product"
                component={ProductScreen}
                options={{ animation: 'fade_from_bottom' }}
              />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen
                name="OrderSuccess"
                component={OrderSuccessScreen}
                options={{ animation: 'fade', animationDuration: 280, gestureEnabled: false }}
              />
              <Stack.Screen
                name="TrackOrder"
                component={TrackOrderScreen}
                options={{ animation: 'slide_from_right', animationDuration: 340 }}
              />
              <Stack.Screen name="Pharmacies" component={PharmaciesScreen} />
              <Stack.Screen name="Reminders" component={RemindersScreen} />
              <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Orders" component={OrdersScreen} />
              <Stack.Screen
                name="Addresses"
                component={AddressesScreen}
                options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
