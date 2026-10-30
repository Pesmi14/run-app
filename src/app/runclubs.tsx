import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function RunclubsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          KOMUNITA
        </Text>

        <Text style={styles.title}>
          Runcluby
        </Text>

        <Text style={styles.subtitle}>
          Najdi běžeckou komunitu ve svém okolí
          nebo objev společné výběhy.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Runcluby připravujeme
          </Text>

          <Text style={styles.cardText}>
            Později zde budou profily klubů,
            členové, společné běhy a závody.
          </Text>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
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
    marginTop: 8,
    color: '#747B76',
    fontSize: 15,
    lineHeight: 21,
  },

  card: {
    marginTop: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E7E4',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },

  cardTitle: {
    color: '#171A18',
    fontSize: 20,
    fontWeight: '800',
  },

  cardText: {
    marginTop: 7,
    color: '#777E79',
    fontSize: 14,
    lineHeight: 20,
  },
});