import { useDebounce } from "react-use";
import { useEffect, useState } from "react";
import Search from "./components/Search";
import Spinner from "./components/Spinner";
import MovieCard from "./components/MovieCard";
import { updateSearchCount, getTrendingMovies } from "./appwrite.ts";

interface moviesProps {
  $id: string;
  searchTerm: string;
  poster_url: string;
}

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`
  }
}

const App = () => {
  const [ searchTerm, setSearchTerm ] = useState("");
  const [ errorMessage, setErrorMessage ] = useState("");
  interface Movie {
    id: string | number;
    title: string;
    vote_average: number;
    poster_path: string | null;
    release_date: string | null;
    original_language: string;
    [key: string]: any;
  }
  
  const [ movieList, setMovieList ]= useState<Movie[]>([]);
  const [ trendingMovies, setTrendingMovies ] = useState<moviesProps[] | []>([]);
  const [ isLoading, setIsLoading ] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // how long it should take before actually changing that value in the state. So instead of passing the OG searchterm which gets updated on every single keystroke, we'll pass the debounced search term instead.
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])
 
  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMessage("")

    try {
      const endpoint = query ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}` : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error("Failed to fetch movies")
      }

      const data = await response.json();
      if (data.Response === "False") {
        setErrorMessage(data.Error || "Failed to fetch movies");
        setMovieList([]);
        return;
      }
      setMovieList(data.results || [])

      // whenever a user perform a search, we want to update the search count
      if (query && data.results.length > 0) {
        // if a movie exists for that query
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error("Error fetching movies: ", error);
      setErrorMessage("Error fetching movies. Please try again later.");
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = (await getTrendingMovies()) ?? [];
      console.log("Trending Movies: ", movies);
      // Map DefaultDocument[] to moviesProps[]
      const mappedMovies = movies.map((movie: any) => ({
        $id: movie.$id,
        searchTerm: movie.searchTerm ?? "",
        poster_url: movie.poster_url ?? ""
      }));
      setTrendingMovies(mappedMovies)
    } catch (error) {
      console.error(`Error fetching trending movies: ${error}`)
    }
  }

  useEffect(() => {
    fetchMovies(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  useEffect(() => {
    loadTrendingMovies()
  }, [])
  return (
    <main>
      <div className='pattern' />
      <div className='wrapper'>
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>
        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.searchTerm} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="all-movies">
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default App