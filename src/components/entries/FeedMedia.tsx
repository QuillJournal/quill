import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const blurhash = "L6PZfSi_00os00j[fQfQ00fQfQfQ";
type FeedMediaItem = {
  uri: string;
  kind: "image" | "video";
};
type FeedMediaProps = {
  items: FeedMediaItem[];
};
export default function FeedMedia({ items }: FeedMediaProps) {
  const shown = items.slice(0, 4);
  const tile = (i: number) => (
    <Image
      source={items[i].uri}
      style={{
        flex: 1,
        aspectRatio: 4 / 3,
      }}
      placeholder={{ blurhash }}
      contentFit="cover"
      transition={1000}
    />
  );
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
