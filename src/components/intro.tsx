import React, {useState} from "react"
import EmptyArt from "@/assets/images/empty.png";
import useTheme from "@/src/hooks/useTheme";
import { 
    FlatList, 
    View, 
    StyleSheet, 
    Text, 
    Image
} from "react-native";
const colors = useTheme();
export default function Intro(){
    const pages = [
        {
            photo: EmptyArt,
            text: "inspiring",
            subtext: "inspiring",
        },
        {
            photo: EmptyArt,
            text: "inspiring2",
            subtext: "inspiring2",
        },
        {
            photo: EmptyArt,
            text: "inspiring3",
            subtext: "inspiring3",
        },
        {
            photo: EmptyArt,
            text: "inspiring4",
            subtext: "inspiring4",
        },
        {
            photo: EmptyArt,
            text: "inspiring5",
            subtext: "inspiring5",
        },
    ]
    const [active, setActive] = useState(0)
    const animate = ({item}) => {
        return(

            <View style = {styles.page}>
                <View style = {styles.card}> 
                    <Image source = {item.image} style = {{width:220, height:220}}/>
                    <Text style = {styles.text}>{item.text}</Text>
                    <Text style = {styles.subtext}>{item.subtext}</Text>
                </View>
                <View style = {styles.scrollers}>
                    {pages.map(index) => {
                        
                    }}
                </View>
            </View>
        );
    }
    const [index, setIndex] = useState(0);
    return(
        <View {styles.container}>
            <FlatList
                data = {pages}
                renderItems = {animate}
                keyExtractor
                horizontal
                initialScrollIndex = 0
                onRefresh = {refresh}
                getItemLayout = {styles.item}
                numColumns = 1 
                columnWrapperStyle
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    page:{

    }
});
