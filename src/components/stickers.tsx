import {
  View, 
  Image
} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler"
import Animated, {useSharedValue, useAnimatedStyle} from "react-native-reanimated"
import {useState} from "react"
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
    //moving 
    const pan = Gesture.Pan().onUpdate((event) => {
        x.value = event.absoluteX;
        y.value = event.absoluteY;
    });
    const pinch = Gesture.Pinch().onUpdate((event) => {
        dilation.value = event.scale
    });

    const image =stickers[0]
    const initialsticker = 100; 

    //resize + move
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const dilation = useSharedValue(1);
    const stickerstyle = useAnimatedStyle(() => {
        return{
        position: "absolute" ,
        left: x.value,
        top: y.value ,
        width: initialsticker*dilation.value,
        height: initialsticker*dilation.value,
        }
    })
    return(
        <Animated.View style = {stickerstyle}> 
            <Image 
                source = {image}
            />
        </Animated.View>
    );
}