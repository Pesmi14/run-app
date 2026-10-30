import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type RaceTab = 'all' | 'mine';

export default function RacesScreen() {
  const [selectedTab, setSelectedTab] =
    useState<RaceTab>('all');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>
          OBJEVUJ. ZÁVOĎ. SDÍLEJ.
        </Text>

        <Text style={styles.title}>
          Závody
        </Text>

        <Text style={styles.subtitle}>
          Najdi další závod a zjisti, kdo se na něj chystá.
        </Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setSelectedTab('all')}
            style={[
              styles.tab,
              selectedTab === 'all' &&
                styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'all' &&
                  styles.tabTextActive,
              ]}
            >
              Závody
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedTab('mine')}
            style={[
              styles.tab,
              selectedTab === 'mine' &&
                styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'mine' &&
                  styles.tabTextActive,
              ]}
            >
              Mé závody
            </Text>
          </Pressable>
        </View>

        {selectedTab === 'all' ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>
              Všechny závody
            </Text>

            <Text style={styles.placeholderText}>
              Sem dáme vyhledávání, filtry a kompletní
              databázi závodů.
            </Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>
              Mé závody
            </Text>

            <Text style={styles.placeholderText}>
              Tady budou uložené, plánované,
              registrované a dokončené závody.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },

  eyebrow: {
    color: '#6B756E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 7,
    color: '#171A18',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },

  subtitle: {
    maxWidth: 330,
    marginTop: 8,
    color: '#747B76',
    fontSize: 15,
    lineHeight: 21,
  },

  tabs: {
    flexDirection: 'row',
    marginTop: 28,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#EDEEEB',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 13,
  },

  tabActive: {
    backgroundColor: '#FFFFFF',
  },

  tabText: {
    color: '#7B817D',
    fontSize: 14,
    fontWeight: '700',
  },

  tabTextActive: {
    color: '#171A18',
  },

  placeholder: {
    marginTop: 25,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E7E4',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },

  placeholderTitle: {
    color: '#171A18',
    fontSize: 20,
    fontWeight: '800',
  },

  placeholderText: {
    marginTop: 7,
    color: '#777E79',
    fontSize: 14,
    lineHeight: 20,
  },
});