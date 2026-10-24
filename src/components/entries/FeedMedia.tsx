import { Image } from "expo-image";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Rect } from "../MediaViewer";

const blurhash = "L6PZfSi_00os00j[fQfQ00fQfQfQ";

export type FeedMediaItem = {
  uri: string;
  kind: "image" | "video";
};

type FeedMediaProps = {
  items: FeedMediaItem[];
  onOpen: (item: FeedMediaItem, origin: Rect) => void;
};

type TileProps = {
  item: FeedMediaItem;
  onOpen: (item: FeedMediaItem, origin: Rect) => void;
};

function Tile({ item, onOpen }: TileProps) {
  const ref = useRef<View>(null);
  const handlePress = () => {
    ref.current?.measureInWindow((x, y, width, height) =>
      onOpen(item, { x, y, width, height }),
    );
  };

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={handlePress}
      style={{
        flex: 1,
      }}
    >
      <Image
        source={item.uri}
        style={{
          aspectRatio: 4 / 3,
        }}
        placeholder={{ blurhash }}
        contentFit="cover"
        transition={1000}
      />
    </Pressable>
  );
}

export default function FeedMedia({ items, onOpen }: FeedMediaProps) {
  const shown = items.slice(0, 4);
  const tile = (i: number) => <Tile item={items[i]} onOpen={onOpen} />;
  const layoutMap = {
    1: () => tile(0),
    2: () => (
      <View style={styles.row}>
        {tile(0)}
        {tile(1)}
      </View>
    ),
    3: () => (
      <View style={styles.row}>
        {tile(0)}
        <View style={styles.column}>
          {tile(1)}
          {tile(2)}
        </View>
      </View>
    ),
    4: () => (
      <View style={styles.column}>
        <View style={styles.row}>
          {tile(0)}
          {tile(1)}
        </View>
        <View style={styles.row}>
          {tile(2)}
          {tile(3)}
        </View>
      </View>
    ),
  };
  const renderLayout = layoutMap[shown.length];
  return <View>{renderLayout()}</View>;
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: 2 },
  column: { flex: 1, gap: 2 },
});
