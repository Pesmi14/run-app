import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

function resolveIconColor(color: unknown) {
  return typeof color === 'string' ? color : '#171A18';
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#171A18',
        tabBarInactiveTintColor: '#8A918C',

        tabBarStyle: {
          height: 88,
          paddingTop: 8,
          paddingBottom: 24,
          borderTopWidth: 1,
          borderTopColor: '#E8EAE8',
          backgroundColor: '#FFFFFF',
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Závody',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'flag' : 'flag-outline'}
              size={size}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="runclubs"
        options={{
          title: 'Runcluby',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventy',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
    </Tabs>
  );
}