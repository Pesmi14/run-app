import { Ionicons } from '@expo/vector-icons';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Profil
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={34}
              color="#616963"
            />
          </View>

          <Text style={styles.name}>
            Tvůj profil
          </Text>

          <Text style={styles.username}>
            @runner
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                0
              </Text>

              <Text style={styles.statLabel}>
                Závodů
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                0
              </Text>

              <Text style={styles.statLabel}>
                Runclubů
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                0
              </Text>

              <Text style={styles.statLabel}>
                Přátel
              </Text>
            </View>
          </View>
        </View>
      </View>
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
  },

  title: {
    color: '#171A18',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },

  profileCard: {
    alignItems: 'center',
    marginTop: 28,
    padding: 25,
    borderWidth: 1,
    borderColor: '#E5E7E4',
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
  },

  avatar: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: '#ECEEEC',
  },

  name: {
    marginTop: 14,
    color: '#171A18',
    fontSize: 21,
    fontWeight: '800',
  },

  username: {
    marginTop: 3,
    color: '#858B87',
    fontSize: 13,
  },

  stats: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ECEEEC',
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    color: '#171A18',
    fontSize: 18,
    fontWeight: '800',
  },

  statLabel: {
    marginTop: 4,
    color: '#7B817D',
    fontSize: 11,
  },

  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E7E9E7',
  },
});