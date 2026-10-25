import { StyleSheet, Text, View } from "react-native";
import MediaThumb from "../MediaThumb";
import type { Rect } from "../MediaViewer";

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
  overlay?: string;
  onOpen: (item: FeedMediaItem, origin: Rect) => void;
};

function Tile({ item, overlay, onOpen }: TileProps) {
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <MediaThumb
        uri={item.uri}
        kind={item.kind}
        hidden={false}
        borderRadius={0}
        label={"h"}
        onOpen={(origin) => onOpen(item, origin)}
      />
      {overlay && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{overlay}</Text>
        </View>
      )}
    </View>
  );
}

export default function FeedMedia({ items, onOpen }: FeedMediaProps) {
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  const tile = (i: number) => (
    <Tile
      item={items[i]}
      overlay={i === shown.length - 1 && extra ? `+${extra}` : undefined}
      onOpen={onOpen}
    />
  );
  const layoutMap: Record<number, () => React.JSX.Element> = {
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
  return (
    <View style={{ aspectRatio: 4 / 3, borderRadius: 8 }}>
      {renderLayout()}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: 2 },
  column: { flex: 1, gap: 2 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: { color: "#fff", fontSize: 18, fontWeight: "500" },
});
