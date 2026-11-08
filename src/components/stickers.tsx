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
    id: number,
    x: number, 
    y: number, 
    dialtion: number, 
    rotation: number, 
    index: number, 
}
function ActiveStickers({sticker}:{sticker:stickertype}){ 
    const x = useSharedValue(sticker.x);
    const y = useSharedValue(sticker.y);
    //
    const startX = useSharedValue(sticker.x);
    const startY = useSharedValue(sticker.y);

    const dilation = useSharedValue(sticker.dialtion);
    //
    const startDialation = useSharedValue(sticker.dialtion);

    const rotation = useSharedValue(sticker.rotation);
    //
    const startRotation = useSharedValue(sticker.rotation);

    const initialsticker = 100; 
    //moving 
    const pan = Gesture.Pan().onStart(() => {
        startX.value = x.value
        startY.value = y.value
    }).onUpdate((event) => {
        x.value =  startX.value + event.translationX;
        y.value =  startY.value +event.translationY;
    });
    const pinch = Gesture.Pinch().onStart(() => {
        startDialation.value = dilation.value
    }).onUpdate((event) => {
        dilation.value = startDialation.value * event.scale
    });
    const rotate = Gesture.Rotation().onStart(() => {
        startRotation.value = rotation.value
    }).onUpdate((event) => {
        rotation.value = startRotation.value + event.rotation
    });
    //resize + move
    const stickerstyle = useAnimatedStyle(() => {
        return{
        position: "absolute" ,
        left: x.value,
        top: y.value ,
        width: initialsticker*dilation.value,
        height: initialsticker*dilation.value,
        transform: [{rotate: `${rotation.value}rad`}] ///...radians...
        }
    })
    //

    return(
        <GestureDetector gesture = {Gesture.Simultaneous(pan, pinch, rotate)}>
            <Animated.View style = {stickerstyle}> 
                <Image 
                    key = {sticker.id}
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
    function getarray(){ 
        return activeStickersArray
    }
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
            ...StyleSheet.absoluteFill, 
            pointerEvents: "box-none",
            
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
    function handlePress(index: number){ 
        setActiveStickersArray(prev => [...prev, 
        {
            id: Date.now() + Math.random() + index,
            x: width/2 -50, 
            y: width/2 - 50, 
            dialtion: 1, 
            rotation: 0, 
            index: index,
        }
    ]);
    }
    function Active(){ 
        return(
            <View pointerEvents = "box-none">
            {activeStickersArray.map((sticker) => 
                <ActiveStickers 
                key = {sticker.id} 
                sticker = {sticker}
                />
            )}
        </View>
        );
    }
    return(
        <View style = {styles.container}>
            {/* STICKERS */}
            {Active()}

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
                {stickers.map((image, index:number) => 
                    <Pressable key = {index} onPress = {() => handlePress(index)}>
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