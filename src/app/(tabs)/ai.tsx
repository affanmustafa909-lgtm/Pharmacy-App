import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from '@/navigation/router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { colors, radii, shadows, spacing } from '@/theme';
import type { ChatMessage } from '@/types';

export default function AiChatScreen() {
  const insets = useSafeAreaInsets();
  const { mobileConfig, products, orderCount, selectedStore } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(mobileConfig.aiMessages);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setMessages(mobileConfig.aiMessages);
  }, [mobileConfig.aiMessages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    let replyText =
      'I can help with catalog search, stock, and orders. For medicine or dosage advice, talk to a pharmacist.';
    if (/(dose|dosage|side effect|take|mg|tablet)/.test(lower)) {
      replyText =
        'That sounds like a medicine or dosage question. Please talk to a pharmacist for personalized guidance. Tap Talk to pharmacist below.';
    } else if (/(order|track|delivery|pickup)/.test(lower)) {
      replyText = `You currently have ${orderCount} order(s) on file. Open My orders to buy again, track, or download a receipt.`;
    } else if (/(stock|available|nearby|store)/.test(lower)) {
      replyText = selectedStore
        ? `You're shopping at ${selectedStore.name}. Search the catalog or open a product to check nearby store availability.`
        : 'Choose a pharmacy first, then I can help check stock.';
    } else {
      const hit = products.find(
        (product) =>
          product.name.toLowerCase().includes(lower) ||
          product.genericName?.toLowerCase().includes(lower) ||
          product.brand.toLowerCase().includes(lower),
      );
      if (hit) {
        replyText = `${hit.name}${hit.genericName ? ` (${hit.genericName})` : ''} is ${
          hit.inStock ? `in stock for ${hit.price.toFixed(2)}` : 'currently out of stock'
        }${hit.rxRequired ? ' and needs a verified prescription' : ''}. I can open the product page for you.`;
      } else {
        replyText =
          'Try searching by brand or generic name. I can also help with stock checks and order status, or route dosage questions to a pharmacist.';
      }
    }
    const reply: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: replyText,
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={16} color={colors.primaryContrast} />
          </View>
          <View>
            <Text style={styles.title}>Hera AI</Text>
            <Text style={styles.subtitle}>Pharmacy assistant</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/scan')} style={styles.scanLink}>
            <Ionicons name="scan-outline" size={16} color={colors.text} />
            <Text style={styles.scanText}>Scan Rx</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/prescriptions')} style={styles.scanLink}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors.text} />
            <Text style={styles.scanText}>Talk to pharmacist</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble,
              shadows.soft,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === 'user' && { color: colors.primaryContrast },
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12) + 72 }]}>
        <View style={[styles.composer, shadows.soft]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about medicines..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} style={styles.send}>
            <Ionicons name="send" size={16} color={colors.primaryContrast} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanText: {
    fontWeight: '600',
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
