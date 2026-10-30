import React, {useState} from "react"
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import { 
    FlatList, 
    View, 
    StyleSheet, 
    Text, 
    Image, 
    Dimensions
} from "react-native";
const height:number = Dimensions.get("window").height;
const width:number = Dimensions.get("window").width;
export default function Intro(){
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

        }, 
        normaldot: {

        },
        container: {
        flex: 1,
        backgroundColor: colors.colors.background,
        },
        card:{
            width: width,
            height: height,
            inset: 0, 
            flex: 1, 
        },
        page:{

        }, 
        scrollers:{ 

        }, 
        text:{

        }, 
        subtext:{ 

        },
        item:{

        }, 
        pages: {
            
        }
    });

    return(
        <View style = {styles.pages}>
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
        </View>
    );

}
