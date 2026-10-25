import React, { useState, createContext, useContext } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import BookPickupScreen from './screens/BookPickupScreen';
import PickupDetailScreen from './screens/PickupDetailScreen';
import BillPaymentScreen from './screens/BillPaymentScreen';

export const AuthContext = createContext();

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const authContext = {
    user,
    token,
    login: (userData, jwtToken) => {
      setUser(userData);
      setToken(jwtToken);
    },
    logout: () => {
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#10b981' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
            cardStyle: { backgroundColor: '#f8fafc' }
          }}
        >
          {!token ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Resident Account' }} />
            </>
          ) : (
            <>
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ title: 'EcoCollect Resident' }} 
              />
              <Stack.Screen 
                name="BookPickup" 
                component={BookPickupScreen} 
                options={{ title: 'Schedule Doorstep Pickup' }} 
              />
              <Stack.Screen 
                name="PickupDetail" 
                component={PickupDetailScreen} 
                options={{ title: 'Pickup Status & Lifecycle' }} 
              />
              <Stack.Screen 
                name="BillPayment" 
                component={BillPaymentScreen} 
                options={{ title: 'Invoice & Payout Settlement' }} 
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
