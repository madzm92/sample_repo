const sampleData = {
    currentReading: [
        ...Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Book ${i + 1}`,
            author: `Author ${i + 1}`,
            coverUrl: `/images/book${i + 1}.jpg`
        }))
    ],

    library: [
        ...Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Book ${i + 1}`,
            author: `Author ${i + 1}`,
            coverUrl: `/images/book${i + 1}.jpg`
        }))
    ],

    info: [
        { id: 1, title: "New Feature", content: "Text highlighting feature now available!" },
        { id: 2, title: "System Update", content: "Performance improvements and bug fixes" },
        { id: 3, title: "New Books", content: "Check out our latest additions to the library" }
    ],

    recommendations: [
        ...Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Recommended Book ${i + 1}`,
            author: `Recommended Author ${i + 1}`,
            coverUrl: `/images/rec${i + 1}.jpg`
        }))
    ]
};



// user data stored here as single source of truth
const userData = {
    // filter current reading from library, no need to store seperately
    library: [
        {
            id: 0,
            title: "",
            author: "",
            coverUrl: "", // not sure this will work. Store img in db or load them from web?
            status: "",  // filter this to show currentreadings
            publishDate: "",
            genre: "",
            description: "",
            productUrl: "",
            isbn: "",
            userReview: "",
            externalReviews: [],
            notes: [] // not sure
        }
    ],
    info: [
        { id: 1, title: "", content: "" }
    ],
    recommendations: [
        {
            id: 0,
            title: "",
            author: "",
            coverUrl: "",
            publishDate: "",
            genre: "",
            description: "",
            productUrl: "",
            isbn: ""
        }
    ]
}