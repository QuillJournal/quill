import {
  View, 
  Image, 
  Pressable, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
} from "react-native";
import { mode } from "@/src/constants/colors";
import {MaterialCommunityIcons} from "@expo/vector-icons"
import {Gesture, GestureDetector} from "react-native-gesture-handler"
import Animated, {
    useSharedValue, 
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated"
import {useState} from "react"; 
const stickers = [
    require("@/assets/images/mood-backgrounds/angry.jpg"),
    require("@/assets/images/mood-backgrounds/anxious.jpg"),
    require("@/assets/images/mood-backgrounds/awesome.jpg"),
    require("@/assets/images/mood-backgrounds/calm.jpg"),
    require("@/assets/images/mood-backgrounds/happy.jpg"),
    require("@/assets/images/mood-backgrounds/meh.jpg"),
    require("@/assets/images/mood-backgrounds/sad.jpg"),
    
];
type stickertype = {
    x: number, 
    y: number, 
    dialtion: number, 
    index: number, 
}
function ActiveStickers({sticker}:{sticker:stickertype}){ 
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    //
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const dilation = useSharedValue(1);
    //
    const startDialation = useSharedValue(1);
    const initialsticker = 100; 
    //moving 
    const panStart = Gesture.Pan().onStart(() => {
        startX.value = x.value
        startY.value = y.value
    });
    const pan = Gesture.Pan().onUpdate((event) => {
        x.value =  startX.value + event.translationX;
        y.value =  startY.value +event.translationY;
    });
    const pinchStart = Gesture.Pinch().onStart(() => {
        startDialation.value = dilation.value
    });
    const pinch = Gesture.Pinch().onUpdate((event) => {
        dilation.value = startDialation.value * event.scale
    });
    //resize + move
    const stickerstyle = useAnimatedStyle(() => {
        return{
        position: "absolute" ,
        left: x.value,
        top: y.value ,
        width: initialsticker*dilation.value,
        height: initialsticker*dilation.value,
        }
    })
    //

    return(
        <GestureDetector gesture = {Gesture.Simultaneous(pan, panStart, pinch, pinchStart)}>
            <Animated.View style = {stickerstyle}> 
                <Image 
                    key = {sticker.index}
                    source = {stickers[sticker.index]}
                    style = {{
                        width: "100%",
                        height: "100%", 
                        objectFit: "contain"
                    }}                              
                />
        </Animated.View>
        </GestureDetector>
    );
}
export default function Stickers(){
    const [activeStickersArray, setActiveStickersArray] = useState<stickertype[]>([]);
    const width:number = Dimensions.get("window").width;
    const height:number = Dimensions.get("window").height;
    //ANIMATION STUFF 
    const animation = useSharedValue(0);


    const [open, setOpen] = useState(false); 
    const barstyle = useAnimatedStyle(() => {
        return{
            width: withSpring(open? width-30: 50,{
                damping: 15, 
                stiffness: 100 
            }),
        }
    })
    const styles = StyleSheet.create({
        container: {
            inset: 0, 
            position: "absolute",
            zIndex: 100,
            elevation: 100,
            pointerEvents: "box-none",
            width: "100%",
            height: "100%",
        },
        bar:{
            position: "absolute",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start", 
            overflow: "hidden",
            gap: 10, 
            bottom: 30, 
            right: 20, 
            height: 100, 

        }, 
        scroll:{
            flex: 1, 
            height: 100, 
        }
    })
    function Active(){ 
        return(
            <View>
            {activeStickersArray.map((sticker) => 
                <ActiveStickers 
                key = {sticker.index} 
                sticker = {sticker}
                />
            )}
        </View>
        );
    }
    return(
        <View style = {styles.container}>
            {/* STICKERS */}
            


            {/* BAR */}
            <Animated.View style = {[barstyle, styles.bar]} pointerEvents = "auto">
                <Pressable 
                    onPress={() => {
                        const tempNext = !open
                        setOpen(prev => !prev)
                        animation.value = withSpring(tempNext? 1:0 , { damping: 15, stiffness: 100 });
                    }}
                >
                    <MaterialCommunityIcons 
                        name = {mode == "dark"? open?"sticker-minus":"sticker-plus":open?"sticker-minus-outline":"sticker-plus-outline"}
                        size = {25}
                    />
                </Pressable>
                {open && 
                <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator = {true}
                style = {styles.scroll}
                contentContainerStyle = {{
                    display: "flex",
                    flexDirection: "row", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    paddingHorizontal: -10,
                }}
                >
                {stickers.map((image, index) => 
                    <Pressable key = {index} onPress = {() => {setActiveStickersArray(prev => [...prev, {
                        x: width/2, 
                        y: width/2, 
                        dialtion: 1, 
                        index: index,
                    }])}}>
                        <Image 
                            source = {image}
                            style = {{
                                width: 100,
                                height: 100, 
                                objectFit: "contain"
                            }}                              
                        />
                    </Pressable>
                )}
                </ScrollView>
                }
            </Animated.View>  
        </View>
    );

}