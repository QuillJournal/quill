import React, {useState} from "react"
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { useRouter } from "expo-router";
import { 
    FlatList, 
    View, 
    StyleSheet, 
    Text, 
    Image, 
    Dimensions, 
    Pressable
} from "react-native";
const height:number = Dimensions.get("window").height;
const width:number = Dimensions.get("window").width;
export default function Intro(){
    const router = useRouter();
    const colors = useTheme();
    const pages = [
        {photo: EmptyArt, text: "inspiring", subtext: "inspiring"},
        {photo: EmptyArt, text: "inspiring2", subtext: "inspiring2"},
        {photo: EmptyArt, text: "inspiring3", subtext: "inspiring3"},
        {photo: EmptyArt, text: "inspiring4", subtext: "inspiring4"},
        {photo: EmptyArt, text: "inspiring5", subtext: "inspiring5"},
    ]
    const [active, setActive] = useState(0)
    const animate = ({item}:{item: typeof pages[number]}) => {
        return(
            <View style = {styles.card}> 
                    <Image source = {item.photo} style = {{width:220, height:220}}/>
                    <Text style = {styles.text}>{item.text}</Text>
                    <Text style = {styles.subtext}>{item.subtext}</Text>
            </View>
        );
    }
    const styles = StyleSheet.create({
        activedot:{
            width: 30, 
            height: 10,
            backgroundColor: colors.colors.accentPressed, 
            borderRadius: 30
        }, 
        normaldot: {
            width: 10, 
            height: 10,
            backgroundColor: colors.colors.accent, 
            borderRadius: 30, 
            opacity: 0.3
        },
        container: {
        flex: 1,
        backgroundColor: colors.colors.background,
        },
        card:{
            width: width,
            height: height/2,
            alignItems: "center", 
            justifyContent: "center",
            inset: 0, 
            flex: 1, 
        },
        page:{
            flex: 1, 
            backgroundColor: colors.colors.shadow
        }, 
        scrollers:{ 
            display: "flex", 
            flexDirection: "row",
            gap: spacing.md, 
            alignItems: "center", 
            justifyContent: "center",
        }, 
        text:{
            color: colors.colors.text
        }, 
        subtext:{ 
            color: colors.colors.textMuted
        },
        item:{

        }, 
        button: { 
             backgroundColor: colors.colors.accent,
            color: colors.colors.text,
            paddingVertical: spacing.xs,
            borderRadius: radius.sm
        }
    });

    return(
        <View style = {styles.page}>
            <View style = {styles.container}>
                <FlatList
                    data = {pages}
                    renderItem = {animate}
                    keyExtractor = {(_,index) =>index.toString()}
                    pagingEnabled

                    horizontal
                    showsHorizontalScrollIndicator = {false}
                    initialScrollIndex= {0}
                    onMomentumScrollEnd = {(event) => {
                        {/* can scroll in any direction. check based on scroll position */}
                        const index = Math.round(event.nativeEvent.contentOffset.x /width)
                        setActive(index)
                    }}
                    getItemLayout = {(_, index) => ({
                        length: width,
                        offset: width*index,
                        index,
                    })}
                    numColumns = {1} 
                />
            </View>
            {/* scrollers/ page dots */}
            <View style = {styles.scrollers}> 
                {pages.map((_, index) => {
                    return(
                        <View 
                            key = {index}
                            style = {index === active? styles.activedot:styles.normaldot}
                        >
                        </View>
                    );
                })}    
            </View> 
            <Pressable onPress = {() => {router.replace("/(auth)/login")}} style = {styles.button}><Text>Start</Text></Pressable>
        </View>
    );

}
