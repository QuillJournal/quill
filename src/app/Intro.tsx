import React, {useState, useRef} from "react"
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fontSizes, fonts } from "@/src/constants/typography";
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
    const activeRef = useRef<FlatList>(null)
    const router = useRouter();
    const colors = useTheme();
    const pages = [
        {photo: EmptyArt, text: "inspiring", subtext: "inspiring"},
        {photo: EmptyArt, text: "inspiring2", subtext: "inspiring2"},
        {photo: EmptyArt, text: "inspiring3", subtext: "inspiring3"},
        {photo: EmptyArt, text: "inspiring4", subtext: "inspiring4"},
        {photo: EmptyArt, text: "inspiring5", subtext: "inspiring5"},
    ]
    const plusonepages = [
        pages[pages.length - 1],
        ...pages,
        pages[0]
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
            width: 40, 
            height: 20,
            backgroundColor: colors.colors.accentPressed, 
            borderRadius: 30
        }, 
        normaldot: {
            width: 20, 
            height: 20,
            backgroundColor: colors.colors.accent, 
            borderRadius: 30, 
            opacity: 0.3
        },
        container: {
            paddingTop: 60,
            height: height * 0.65,
            width: width, 
            alignItems: "center"
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
            backgroundColor: colors.colors.background,
            gap: 50,
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
            paddingVertical: spacing.md,
            borderRadius: radius.sm,
            marginBottom: 50, 
            alignItems: "center", 
            textAlign: "center",
            width: width*0.7,
            justifyContent: "center",
            alignSelf: "center"
        }
    });
    const changePage = (index:number, animated:boolean) => {
        setActive(index)
        activeRef.current?.scrollToIndex({
            index:index + 1,
            animated:animated
        });
    };
    return(
        <View style = {styles.page}>
            <View style = {styles.container}>
                <FlatList
                    ref = {activeRef}
                    data = {plusonepages}
                    renderItem = {animate}
                    keyExtractor = {(_,index) =>index.toString()}
                    pagingEnabled

                    horizontal
                    showsHorizontalScrollIndicator = {false}
                    initialScrollIndex= {1}
                    decelerationRate = "fast"
                    snapToAlignment = "center"
                    directionalLockEnabled
                    disableIntervalMomentum = {true}
                    onMomentumScrollEnd = {(event) => {
                        {/* can scroll in any direction. check based on scroll position */}
                        const index = Math.round(event.nativeEvent.contentOffset.x /width)
                        if(index === plusonepages.length - 1){
                            //element 7 go back to element 1 
                            changePage(0, true);

                        }else if(index === 0 ){
                            //element 0, go back to element 6 
                            changePage(plusonepages.length - 3, true);
                        }else{
                            setActive(index - 1)
                        }
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
                        <Pressable 
                            hitSlop = {5}
                            key = {index} 
                            onPress = {() => {changePage(index, true)}}
                        >
                            <View style = {index === active? styles.activedot:styles.normaldot}>
                            </View>
                        </Pressable>
                    );
                })}    
            </View> 
            <Pressable onPress = {() => {router.replace("/(auth)/login")}} style = {styles.button}><Text style = {{fontSize: fontSizes.xl, fontFamily: fonts.heading}}>Start</Text></Pressable>
        </View>
    );

}
