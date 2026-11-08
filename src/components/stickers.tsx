import {
  View, 
  Image, 
  Pressable
} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler"
import Animated, {
    useSharedValue, 
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated"
import FloatingActionButton from "@/src/components/FloatingActionButton"
import {useState} from "react"; 
const stickers = [
    require("@/assets/images/mood-backgrounds/angry.jpg"),
    require("@/assets/images/mood-backgrounds/anxious.jpg"),
    require("@/assets/images/mood-backgrounds/awesome.jpg"),
    require("@/assets/images/mood-backgrounds/calm.jpg"),
    require("@/assets/images/mood-backgrounds/happy.jpg"),
    require("@/assets/images/mood-backgrounds/meh.jpg"),
    require("@/assets/images/mood-backgrounds/sad.jpg")
];
export default function Stickers(){
    //ANIMATION STUFF 
    const animation = useSharedValue(0); //0 close 1 open 

    const [activeStickers, setActiveStickers] = useState<number[]>([]);
    const [open, setOpen] = useState(false); 
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
    const barstyle = useAnimatedStyle(() => {
        return{
            opacity: animation.value,
            transform: [{scale: animation.value}], 
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center", 
            gap: 10, 
            pointerEvents: open? "auto": "none"
        }
    })
    function Active(){ 
        return(
        <Animated.View style = {stickerstyle}> 
            {activeStickers.map((index) => 
                <Image 
                    key = {index}
                    source = {stickers[index]}
                    style = {{
                        width: "100%",
                        height: "100%", 
                        objectFit: "contain"
                    }}                              
                />
            )}
        </Animated.View>
        );
    }
    return(
        <View>
            {/* STICKERS */}
            <GestureDetector gesture = {Gesture.Simultaneous(pan, panStart, pinch, pinchStart)}>
                {Active()}
            </GestureDetector>


            {/* BAR */}
            <FloatingActionButton 
                onPress={() => {
                    const tempNext = !open
                    setOpen(prev => !prev)
                    animation.value = withSpring(tempNext? 1:0 , { damping: 15, stiffness: 100 });
                }}
                positioned={false}
            />
            <Animated.View style = {barstyle}>
                {stickers.map((image, index) => 
                    <Pressable key = {index} onPress = {() => {setActiveStickers(prev => [...prev, index])}}>
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
            </Animated.View>
        </View>
    );

}