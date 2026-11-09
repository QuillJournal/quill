import { useEffect, useState } from "react";
import {
    Dimensions,
    Image,

    StyleSheet,
    View,
} from "react-native";
import { getStickersByEntryId } from "../db/stickerupdate";
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
function ActiveStickers({sticker}: {sticker:stickertype}){ 
    return(
        <View>
            <Image 
                key = {sticker.id}
                source = {stickers[sticker.index]}
                style = {{
                    position: "absolute", 
                    left: sticker.x, 
                    top: sticker.y,
                    width: 100*sticker.dialtion,
                    height: 100*sticker.dialtion, 
                    objectFit: "contain",
                    transform: [{rotate: `${sticker.rotation}rad`}]
                }}                              
            />
        </View>
    );
}
export default function Stickers({entryId}:{entryId?: number}){
    const width:number = Dimensions.get("window").width;
    const [stickers, setStickers] = useState<stickertype[]>([]); 
    useEffect(() => {
        if (!entryId) return;
        const id = entryId; 
        //check for old ones 
        async function initialize(){
            try{
                const stuff = await getStickersByEntryId(id)
                setStickers(stuff)
            }catch(error){
                console.error("Error loading the stickers: ", error)
            }

        }
        initialize()
    },[entryId])

    const styles = StyleSheet.create({
        container: {
            inset: 0, 
            position: "absolute",
            pointerEvents: "box-none",
            
        },
    })
    function Active(){ 
        return(
            <View pointerEvents = "box-none">
                {stickers.map((sticker) => (
                    <ActiveStickers 
                        key = {sticker.id} 
                        sticker = {sticker}
                    />
                ))}
            </View>
        );
    }
    return(
        <View pointerEvents = "none" style = {styles.container}>
            {/* STICKERS */}
            {Active()} 
        </View>
    );

}