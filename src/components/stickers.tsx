import { mode } from "@/src/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { getStickersByEntryId, updateStickersByEntryId } from "../db/stickerupdate";
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
function ActiveStickers({sticker,update}: {sticker:stickertype, update:(value: stickertype) => void}){ 
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

    const saveStickers = (
        newX:number,
        newY: number,
        newDialation:number,
        newRotation: number,
    ) => {
        update({
            ...sticker,
            x: newX,
            y: newY,
            dialtion: newDialation,
            rotation: newRotation,
        })
    }

    //pan 
    const pan = Gesture.Pan().onStart(() => {
        startX.value = x.value
        startY.value = y.value
    }).onUpdate((event) => {
        x.value =  startX.value + event.translationX;
        y.value =  startY.value +event.translationY;
    }).onEnd(() =>{
        runOnJS(saveStickers)(
            x.value, 
            y.value, 
            dilation.value, 
            rotation.value, 
        );
    });

    //pinch
    const pinch = Gesture.Pinch().onStart(() => {
        startDialation.value = dilation.value
    }).onUpdate((event) => {
        dilation.value = startDialation.value * event.scale
    }).onEnd(() =>{
        runOnJS(saveStickers)(
            x.value, 
            y.value, 
            dilation.value, 
            rotation.value,
        );
    });

    //rotate
    const rotate = Gesture.Rotation().onStart(() => {
        startRotation.value = rotation.value
    }).onUpdate((event) => {
        rotation.value = startRotation.value + event.rotation
    }).onEnd(() =>{
        runOnJS(saveStickers)(
            x.value, 
            y.value, 
            dilation.value, 
            rotation.value,
        );
    });
    //delete
    const hold = Gesture.LongPress().minDuration(800)
    .onStart(() => {
        runOnJS(update)({
            ...sticker,
            id: -1,
        });
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
    return(
        <GestureDetector gesture = {Gesture.Simultaneous(pan, pinch, rotate, hold)}>
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
type StickerProps =  {
    activeStickersArray: stickertype[];
    onChange: (stickers:stickertype[]) => void;
    entryId?: number;
}
export default function Stickers({
    activeStickersArray,
    onChange,
    entryId
}:StickerProps){
    const width:number = Dimensions.get("window").width;
    const height:number = Dimensions.get("window").height;
    //ANIMATION STUFF 
    const animation = useSharedValue(0);

    useEffect(() => {
        if (!entryId) return; 
        const id = entryId;
        let active = true; 
        //check for old ones 
        async function initialize(){
            try{
            const newStickers = await getStickersByEntryId(id)
            if(active){
                onChange(newStickers)
            }
            }catch(error){
                console.error("Error loading the stickers: ", error)
            }

        }
        initialize()
        return() => {
            active = false
        }
    },[entryId,onChange])

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
        onChange([...activeStickersArray, 
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
                {activeStickersArray.map((sticker) => (
                    <ActiveStickers 
                    key = {sticker.id} 
                    sticker = {sticker}
                    update = {(value:stickertype) => {
                        const updated = value.id === -1?
                        activeStickersArray.filter(stickerinner => stickerinner.id !== sticker.id):
                        activeStickersArray.map((stickerinner) =>
                            stickerinner.id === value.id? value: stickerinner
                        );
                        onChange(updated)
                        if (entryId){
                            updateStickersByEntryId(entryId,updated).catch(err => {
                                console.error("Error saving your stickers: ", err)
                            });
                        }
                    }}
                    />
            ))}
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