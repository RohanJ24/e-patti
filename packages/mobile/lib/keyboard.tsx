import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle
} from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function KeyboardScreen({ children, style, contentContainerStyle }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keepFocusedInputVisible = useCallback((keyboardTop: number) => {
    const input = TextInput.State.currentlyFocusedInput?.();
    const scroll = scrollRef.current;
    if (!input || !scroll) return;

    const reveal = () => {
      input.measureInWindow((_x: number, y: number, _w: number, height: number) => {
        const overlap = y + height - keyboardTop + 28;
        if (overlap > 0) {
          scroll.scrollTo({ y: Math.max(0, scrollY.current + overlap), animated: true });
        }
      });
    };

    requestAnimationFrame(reveal);
    setTimeout(reveal, 80);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      keepFocusedInputVisible(event.endCoordinates.screenY);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keepFocusedInputVisible]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }

  const flattenedContent = StyleSheet.flatten(contentContainerStyle);
  const basePadding = typeof flattenedContent?.paddingBottom === "number" ? flattenedContent.paddingBottom : 48;
  const extraPadding = Platform.OS === "android" ? keyboardHeight : 0;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        style={[styles.flex, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, contentContainerStyle, { paddingBottom: basePadding + extraPadding }]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 }
});
